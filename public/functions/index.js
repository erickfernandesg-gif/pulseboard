const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Função HTTPS "Callable" para aprovar uma nova organização.
 * É acionada pelo Painel de Admin.
 */
exports.approveOrganization = functions.https.onCall(async (data, context) => {
    // Verificação de segurança: Apenas utilizadores autenticados podem chamar esta função.
    // Numa aplicação real, verificaríamos se o chamador é um "Super Admin".
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Ação não permitida. Você precisa estar autenticado.');
    }

    const db = admin.firestore();
    const requestId = data.requestId;

    if (!requestId) {
        throw new functions.https.HttpsError('invalid-argument', 'O ID da solicitação é obrigatório.');
    }

    // 1. Busca os dados da solicitação pendente
    const requestRef = db.collection('registrationRequests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Solicitação de registo não encontrada.');
    }
    const requestData = requestDoc.data();
    if (requestData.status !== 'pending') {
        throw new functions.https.HttpsError('failed-precondition', 'Esta solicitação já foi processada.');
    }

    // 2. Cria o novo utilizador no Firebase Authentication
    let newUser;
    try {
        newUser = await admin.auth().createUser({
            email: requestData.email,
            displayName: requestData.userName,
            emailVerified: false, // O utilizador pode verificar o e-mail depois
        });
    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
             throw new functions.https.HttpsError('already-exists', 'Este e-mail já está em uso no sistema.');
        }
        console.error("Erro ao criar utilizador na autenticação:", error);
        throw new functions.https.HttpsError('internal', 'Erro interno ao criar o utilizador.');
    }

    // 3. Cria a nova Organização no Firestore
    const orgRef = await db.collection('organizations').add({
        name: requestData.companyName,
        ownerId: newUser.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Adiciona o novo utilizador como "owner" na sub-coleção de membros
    await orgRef.collection('members').doc(newUser.uid).set({
        name: newUser.displayName,
        email: newUser.email,
        role: 'owner', // O primeiro utilizador é o dono
        teamId: '',
    });

    // 5. Atualiza o estado da solicitação para "approved"
    await requestRef.update({ 
        status: 'approved',
        processedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 6. (Passo Futuro) Envia o e-mail de boas-vindas para o cliente
    // Ex: await sendWelcomeEmail(requestData.email, requestData.companyName);

    console.log(`Organização '${requestData.companyName}' aprovada com sucesso.`);
    return { success: true, message: `Empresa ${requestData.companyName} aprovada e ativada!` };
});