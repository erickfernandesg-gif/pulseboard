const Admin = {
    template: `
        <div class="main-content">
            <header class="page-header">
                <h1><i class="fa-solid fa-user-shield"></i> Painel de Administração</h1>
            </header>

            <div v-loading="loading">
                <el-card class="admin-section">
                    <template #header>
                        <div class="card-header-title">
                            <h2>Solicitações Pendentes</h2>
                            <el-badge :value="pendingRequests.length" class="item" :hidden="pendingRequests.length === 0">
                                <i class="fa-solid fa-bell"></i>
                            </el-badge>
                        </div>
                    </template>
                    <el-table :data="pendingRequests" stripe style="width: 100%">
                        <el-table-column prop="companyName" label="Empresa"></el-table-column>
                        <el-table-column prop="userName" label="Nome do Solicitante"></el-table-column>
                        <el-table-column prop="email" label="E-mail"></el-table-column>
                        <el-table-column label="Ações" width="120" align="right">
                            <template #default="scope">
                                <el-button @click="approveRequest(scope.row.id)" type="success" :icon="'Select'" circle plain title="Aprovar" />
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-if="!loading && pendingRequests.length === 0" description="Nenhuma solicitação pendente."></el-empty>
                </el-card>

                <el-card class="admin-section">
                    <template #header>
                        <div class="card-header-title">
                            <h2>Gerenciar Times</h2>
                            <el-button type="primary" :icon="'Plus'" @click="openAddTeamDialog">Adicionar Time</el-button>
                        </div>
                    </template>
                    <el-table :data="teamsAsArray" stripe style="width: 100%">
                        <el-table-column label="Cor" width="80">
                            <template #default="scope">
                                <span class="team-color-dot" :style="{ backgroundColor: scope.row.color }"></span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="name" label="Nome do Time"></el-table-column>
                        <el-table-column prop="userCount" label="Nº de Usuários" width="150"></el-table-column>
                        <el-table-column label="Ações" width="120" align="right">
                            <template #default="scope">
                                <el-button @click="openEditTeamModal(scope.row.id, scope.row)" :icon="'Edit'" circle plain title="Editar" />
                                <el-button @click="confirmDeleteTeam(scope.row.id, scope.row.name)" type="danger" :icon="'Delete'" circle plain title="Excluir" />
                            </template>
                        </el-table-column>
                    </el-table>
                </el-card>

                <el-card class="admin-section">
                    <template #header>
                        <h2>Gerenciar Usuários</h2>
                    </template>
                    <el-table :data="users" stripe style="width: 100%">
                        <el-table-column prop="name" label="Nome"></el-table-column>
                        <el-table-column prop="email" label="E-mail"></el-table-column>
                        <el-table-column label="Time" width="250">
                             <template #default="scope">
                                <el-select v-model="scope.row.teamId" placeholder="Sem time" @change="updateUserTeam(scope.row.id, scope.row.teamId)" clearable>
                                    <el-option v-for="team in teamsAsArray" :key="team.id" :label="team.name" :value="team.id"></el-option>
                                </el-select>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-card>
            </div>

            <el-dialog v-model="showTeamDialog" :title="isEditing ? 'Editar Time' : 'Adicionar Novo Time'" width="500px">
                <el-form :model="teamForm" label-position="top" ref="teamFormRef">
                    <el-form-item label="Nome do Time" prop="name">
                        <el-input v-model="teamForm.name" required></el-input>
                    </el-form-item>
                    <el-form-item label="Cor de Destaque" prop="color">
                         <div class="color-picker-group">
                            <el-color-picker v-model="teamForm.color" />
                            <el-input v-model="teamForm.color" required />
                        </div>
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="closeTeamDialog">Cancelar</el-button>
                    <el-button type="primary" @click="saveTeam">Salvar</el-button>
                </template>
            </el-dialog>
        </div>
    `,
    data() {
        return {
            loading: true,
            teams: {},
            users: [],
            pendingRequests: [],
            showTeamDialog: false,
            isEditing: false,
            teamForm: { id: null, name: '', color: '#4A90E2' },
            db: firebase.firestore(),
            // ALTERAÇÃO 1: Adiciona a referência às funções do Firebase
            functions: firebase.functions(), 
        }
    },
    computed: {
        teamsAsArray() {
            return Object.entries(this.teams).map(([id, data]) => ({ id, ...data }));
        }
    },
    methods: {
        async fetchPendingRequests() {
            const snapshot = await this.db.collection('registrationRequests').where('status', '==', 'pending').get();
            this.pendingRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        // ALTERAÇÃO 2: A lógica do botão "Aprovar" agora está completa
        async approveRequest(requestId) {
            this.loading = true; // Opcional: mostra um loading na tela inteira
            
            try {
                // Cria a referência para a função "callable"
                const approveFunction = this.functions.httpsCallable('approveOrganization');
                
                ElementPlus.ElMessage.info('Processando a aprovação...');
                
                // Chama a função com o ID da solicitação
                const result = await approveFunction({ requestId: requestId });
                
                // Mostra a mensagem de sucesso que veio do backend
                ElementPlus.ElMessage.success(result.data.message);
                
                // Remove a solicitação da lista na tela, sem precisar recarregar a página
                this.pendingRequests = this.pendingRequests.filter(req => req.id !== requestId);
                
            } catch (error) {
                // Mostra uma mensagem de erro clara para o usuário
                console.error("Erro ao chamar a função 'approveOrganization':", error);
                ElementPlus.ElMessage.error(`Erro: ${error.message}`);
            } finally {
                this.loading = false; // Garante que o loading seja removido
            }
        },
        // --- O resto dos métodos permanece o mesmo que você já tem ---
        calculateUserCounts() {
            const counts = this.users.reduce((acc, user) => {
                if (user.teamId) { acc[user.teamId] = (acc[user.teamId] || 0) + 1; }
                return acc;
            }, {});
            Object.values(this.teams).forEach(team => {
                team.userCount = counts[team.id] || 0;
            });
        },
        async fetchTeams() {
            const snapshot = await this.db.collection('teams').orderBy('name').get();
            let teamsData = {};
            snapshot.forEach(doc => { teamsData[doc.id] = doc.data(); });
            this.teams = teamsData;
        },
        async fetchUsers() {
            const snapshot = await this.db.collection('users').orderBy('name').get();
            this.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        openAddTeamDialog() {
            this.isEditing = false;
            this.teamForm = { id: null, name: '', color: '#4A90E2' };
            this.showTeamDialog = true;
        },
        openEditTeamModal(id, team) {
            this.isEditing = true;
            this.teamForm = { id, ...team };
            this.showTeamDialog = true;
        },
        closeTeamDialog() { this.showTeamDialog = false; },
        async saveTeam() {
            if (!this.teamForm.name || !this.teamForm.color) return;
            if (this.isEditing) {
                const { id, name, color } = this.teamForm;
                await this.db.collection('teams').doc(id).update({ name, color });
                ElementPlus.ElMessage.success('Time atualizado com sucesso!');
            } else {
                const teamId = this.teamForm.name.toLowerCase().replace(/\s+/g, '-');
                await this.db.collection('teams').doc(teamId).set({ name: this.teamForm.name, color: this.teamForm.color });
                ElementPlus.ElMessage.success('Novo time adicionado!');
            }
            this.closeTeamDialog();
            await this.fetchTeams();
            this.calculateUserCounts();
        },
        confirmDeleteTeam(teamId, teamName) {
            const team = this.teamsAsArray.find(t => t.id === teamId);
            const usersInTeam = team ? team.userCount : 0;
            let warningText = "Esta ação não pode ser revertida!";
            if (usersInTeam > 0) { warningText += `<br><br><strong>Atenção:</strong> Existem ${usersInTeam} usuário(s) neste time.`; }
            ElementPlus.ElMessageBox.confirm(warningText, `Excluir o time "${teamName}"?`, { confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar', type: 'warning', dangerouslyUseHTMLString: true })
                .then(() => this.deleteTeam(teamId)).catch(() => {});
        },
        async deleteTeam(teamId) {
            await this.db.collection('teams').doc(teamId).delete();
            const usersToUpdate = this.users.filter(u => u.teamId === teamId);
            const batch = this.db.batch();
            usersToUpdate.forEach(user => {
                const userRef = this.db.collection('users').doc(user.id);
                batch.update(userRef, { teamId: '' });
            });
            await batch.commit();
            ElementPlus.ElMessage.success('O time foi removido.');
            await this.fetchTeams();
            await this.fetchUsers();
            this.calculateUserCounts();
        },
        async updateUserTeam(userId, teamId) {
            await this.db.collection('users').doc(userId).update({ teamId: teamId || '' });
            ElementPlus.ElMessage({ message: 'Time do usuário atualizado!', type: 'success' });
            this.calculateUserCounts();
        },
    },
    async mounted() {
        this.loading = true;
        await Promise.all([
            this.fetchUsers(),
            this.fetchTeams(),
            this.fetchPendingRequests()
        ]);
        this.calculateUserCounts();
        this.loading = false;
    }
};