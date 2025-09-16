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
                            <h2>Visão Geral das Empresas</h2>
                        </div>
                    </template>
                    <div class="company-filter">
                        <el-select 
                            v-model="selectedOrganizationId" 
                            placeholder="Selecione uma empresa para gerenciar" 
                            @change="onOrganizationChange"
                            filterable 
                            clearable
                            style="width: 100%;">
                            <el-option 
                                v-for="org in activeOrganizations" 
                                :key="org.id" 
                                :label="org.name" 
                                :value="org.id">
                            </el-option>
                        </el-select>
                    </div>
                </el-card>

                <el-card class="admin-section">
                    <template #header>
                        <div class="card-header-title">
                            <h2>Empresas Aguardando Aprovação</h2>
                            <el-badge :value="pendingOrganizations.length" class="item" :hidden="pendingOrganizations.length === 0">
                                <i class="fa-solid fa-bell"></i>
                            </el-badge>
                        </div>
                    </template>
                    <el-table :data="pendingOrganizations" stripe style="width: 100%">
                        <el-table-column prop="name" label="Empresa"></el-table-column>
                        <el-table-column prop="ownerName" label="Nome do Solicitante"></el-table-column>
                        <el-table-column prop="ownerEmail" label="E-mail do Solicitante"></el-table-column>
                        <el-table-column label="Ações" width="120" align="right">
                            <template #default="scope">
                                <el-button @click="approveOrganization(scope.row.id)" type="success" :icon="'Select'" circle plain title="Aprovar Empresa" />
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-if="!loading && pendingOrganizations.length === 0" description="Nenhuma empresa aguardando aprovação."></el-empty>
                </el-card>

                <div v-if="selectedOrganizationId">
                    <el-card class="admin-section">
                        <template #header>
                            <div class="card-header-title">
                                <h2>Gerenciar Times da Empresa: {{ getSelectedOrgName() }}</h2>
                                <el-button type="primary" :icon="'Plus'" @click="openAddTeamDialog">Adicionar Time</el-button>
                            </div>
                        </template>
                        <el-table :data="teamsAsArray" stripe style="width: 100%">
                            <el-table-column label="Cor" width="80"><template #default="scope"><span class="team-color-dot" :style="{ backgroundColor: scope.row.color }"></span></template></el-table-column>
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
                            <h2>Gerenciar Usuários da Empresa: {{ getSelectedOrgName() }}</h2>
                        </template>
                        <el-table :data="users" stripe style="width: 100%">
                            <el-table-column prop="name" label="Nome"></el-table-column>
                            <el-table-column prop="email" label="E-mail"></el-table-column>
                            <el-table-column label="Papel" width="200"><template #default="scope"><el-select v-model="scope.row.role" @change="updateUserRole(scope.row)"><el-option v-for="role in roles" :key="role.value" :label="role.label" :value="role.value"></el-option></el-select></template></el-table-column>
                            <el-table-column label="Time / Times Gerenciados" width="300">
                                <template #default="scope">
                                    <el-select v-if="scope.row.role === 'team_lead'" v-model="scope.row.managedTeams" multiple filterable placeholder="Selecione os times" style="width: 100%;" @change="updateUserManagedTeams(scope.row.id, scope.row.managedTeams)"><el-option v-for="team in teamsAsArray" :key="team.id" :label="team.name" :value="team.id"></el-option></el-select>
                                    <el-select v-else-if="scope.row.role === 'member'" v-model="scope.row.teamId" placeholder="Sem time" style="width: 100%;" @change="updateUserTeam(scope.row.id, scope.row.teamId)" clearable><el-option v-for="team in teamsAsArray" :key="team.id" :label="team.name" :value="team.id"></el-option></el-select>
                                    <el-tag v-else type="info">N/A (Acesso total)</el-tag>
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-card>
                </div>

                <el-dialog v-model="showTeamDialog" :title="isEditing ? 'Editar Time' : 'Adicionar Novo Time'" width="500px">
                    <el-form :model="teamForm" label-position="top" ref="teamFormRef">
                        <el-form-item label="Nome do Time" prop="name"><el-input v-model="teamForm.name" required></el-input></el-form-item>
                        <el-form-item label="Cor de Destaque" prop="color"><div class="color-picker-group"><el-color-picker v-model="teamForm.color" /><el-input v-model="teamForm.color" required /></div></el-form-item>
                    </el-form>
                    <template #footer><el-button @click="closeTeamDialog">Cancelar</el-button><el-button type="primary" @click="saveTeam">Salvar</el-button></template>
                </el-dialog>
            </div>
        </div>
    `,
    data() {
        return {
            loading: true,
            pendingOrganizations: [],
            activeOrganizations: [],
            selectedOrganizationId: '',
            teams: [],
            users: [],
            showTeamDialog: false,
            isEditing: false,
            teamForm: { id: null, name: '', color: '#4A90E2' },
            db: firebase.firestore(),
            roles: [
                { value: 'member', label: 'Membro' },
                { value: 'team_lead', label: 'Líder de Equipe' },
                { value: 'admin', label: 'Admin' }
            ],
            currentUser: null
        }
    },
    computed: {
        teamsAsArray() {
            return this.teams;
        }
    },
    methods: {
        async fetchAllActiveOrganizations() {
            const snapshot = await this.db.collection('organizations').where('status', '==', 'active').orderBy('name').get();
            this.activeOrganizations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        async onOrganizationChange(orgId) {
            if (orgId) {
                this.loading = true;
                await Promise.all([
                    this.fetchTeams(orgId),
                    this.fetchUsers(orgId)
                ]);
                this.loading = false;
            } else {
                this.teams = [];
                this.users = [];
            }
        },
        getSelectedOrgName() {
            const org = this.activeOrganizations.find(o => o.id === this.selectedOrganizationId);
            return org ? org.name : '';
        },
        async fetchTeams(organizationId) {
            const snapshot = await this.db.collection('teams')
                .where('organizationId', '==', organizationId)
                .orderBy('name')
                .get();
            this.teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        async fetchUsers(organizationId) {
            const snapshot = await this.db.collection('users')
                .where('organizationId', '==', organizationId)
                .get();
            this.users = snapshot.docs.map(doc => {
                const data = doc.data();
                if (data.role === 'team_lead' && !Array.isArray(data.managedTeams)) {
                    data.managedTeams = [];
                }
                return { id: doc.id, ...data };
            });
        },
        async saveTeam() {
            if (!this.teamForm.name || !this.teamForm.color) { ElementPlus.ElMessage.error('Nome e cor do time são obrigatórios.'); return; }
            if (!this.selectedOrganizationId) { ElementPlus.ElMessage.error('Por favor, selecione uma empresa no filtro antes de adicionar um time.'); return; }
            this.loading = true;
            try {
                if (this.isEditing) {
                    const { id, ...teamData } = this.teamForm;
                    await this.db.collection('teams').doc(id).update(teamData);
                    ElementPlus.ElMessage.success('Time atualizado com sucesso!');
                } else {
                    const newTeam = {
                        name: this.teamForm.name,
                        color: this.teamForm.color,
                        organizationId: this.selectedOrganizationId
                    };
                    await this.db.collection('teams').add(newTeam);
                    ElementPlus.ElMessage.success('Novo time adicionado!');
                }
                this.closeTeamDialog();
                await this.fetchTeams(this.selectedOrganizationId);
            } catch (error) {
                console.error("Erro ao salvar time:", error);
                ElementPlus.ElMessage.error('Ocorreu um erro ao salvar o time.');
            } finally {
                this.loading = false;
            }
        },
        async fetchPendingOrganizations() {
            const orgSnapshot = await this.db.collection('organizations').where('status', '==', 'pending').get();
            if (orgSnapshot.empty) { this.pendingOrganizations = []; return; }
            const orgsData = await Promise.all(orgSnapshot.docs.map(async (doc) => {
                const org = { id: doc.id, ...doc.data() };
                const userDoc = await this.db.collection('users').doc(org.ownerId).get();
                if (userDoc.exists) { org.ownerName = userDoc.data().name; org.ownerEmail = userDoc.data().email; }
                return org;
            }));
            this.pendingOrganizations = orgsData;
        },
        async approveOrganization(organizationId) {
            try {
                ElementPlus.ElMessage.info('Aprovando empresa...');
                const orgRef = this.db.collection('organizations').doc(organizationId);
                await orgRef.update({ status: 'active' });
                ElementPlus.ElMessage.success('Empresa aprovada com sucesso!');
                await this.fetchPendingOrganizations();
                await this.fetchAllActiveOrganizations();
            } catch (error) {
                console.error("Erro ao aprovar organização:", error);
                ElementPlus.ElMessage.error('Ocorreu um erro ao aprovar a empresa.');
            }
        },
        calculateUserCounts() {
            const counts = this.users.reduce((acc, user) => {
                if (user.teamId) { acc[user.teamId] = (acc[user.teamId] || 0) + 1; }
                return acc;
            }, {});
            this.teams.forEach(team => {
                team.userCount = counts[team.id] || 0;
            });
        },
        openAddTeamDialog() {
            this.isEditing = false;
            this.teamForm = { id: null, name: '', color: '#4A90E2' };
            this.showTeamDialog = true;
        },
        openEditTeamModal(id, team) {
            this.isEditing = true;
            this.teamForm = { ...team };
            this.showTeamDialog = true;
        },
        closeTeamDialog() { this.showTeamDialog = false; },
        confirmDeleteTeam(teamId, teamName) {
            ElementPlus.ElMessageBox.confirm(`Tem certeza que deseja excluir o time "${teamName}"? Esta ação não pode ser revertida.`, 'Atenção', {
                confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar', type: 'warning'
            }).then(async () => { await this.deleteTeam(teamId); }).catch(() => {});
        },
        async deleteTeam(teamId) {
            this.loading = true;
            try {
                await this.db.collection('teams').doc(teamId).delete();
                ElementPlus.ElMessage.success('Time removido com sucesso.');
                await this.fetchTeams(this.selectedOrganizationId);
            } catch (error) {
                console.error("Erro ao deletar time:", error);
                ElementPlus.ElMessage.error('Ocorreu um erro ao remover o time.');
            } finally {
                this.loading = false;
            }
        },
        async updateUserRole(user) {
            const newRole = user.role;
            const userId = user.id;
            try {
                const userRef = this.db.collection('users').doc(userId);
                const batch = this.db.batch();
                batch.update(userRef, { role: newRole });

                if (newRole === 'team_lead') {
                    if (user.teamId) {
                         batch.update(userRef, { teamId: firebase.firestore.FieldValue.delete() });
                    }
                    batch.set(userRef, { managedTeams: [] }, { merge: true });
                } else if (newRole === 'member') {
                     if (user.managedTeams) {
                        batch.update(userRef, { managedTeams: firebase.firestore.FieldValue.delete() });
                    }
                    batch.set(userRef, { teamId: '' }, { merge: true });
                }
                await batch.commit();
                ElementPlus.ElMessage.success('Papel do usuário atualizado!');
                await this.fetchUsers(this.selectedOrganizationId);
            } catch (error) {
                console.error("Erro ao atualizar papel:", error);
                ElementPlus.ElMessage.error('Ocorreu um erro ao atualizar o papel.');
            }
        },
        async updateUserTeam(userId, teamId) {
            try {
                await this.db.collection('users').doc(userId).update({ teamId: teamId || '' });
                ElementPlus.ElMessage.success('Time do usuário atualizado!');
                this.calculateUserCounts();
            } catch (error) {
                console.error("Erro ao atualizar time do usuário:", error);
                ElementPlus.ElMessage.error('Ocorreu um erro ao atualizar o time.');
            }
        },
        async updateUserManagedTeams(userId, managedTeams) {
            try {
                const userRef = this.db.collection('users').doc(userId);
                await userRef.update({ managedTeams: managedTeams || [] });
                ElementPlus.ElMessage.success('Times gerenciados pelo líder foram atualizados!');
            } catch (error) {
                console.error("Erro ao atualizar times do líder:", error);
                ElementPlus.ElMessage.error('Ocorreu um erro ao salvar as alterações.');
            }
        },
    },
    async mounted() {
        this.loading = true;
        try {
            const loggedInUser = firebase.auth().currentUser;
            if (loggedInUser) {
                const userDoc = await this.db.collection('users').doc(loggedInUser.uid).get();
                if (userDoc.exists) {
                    this.currentUser = { uid: loggedInUser.uid, ...userDoc.data() };
                }
            }
            await this.fetchPendingOrganizations();
            await this.fetchAllActiveOrganizations();
        } catch (error) {
            console.error("Erro ao carregar dados do painel de admin:", error);
            ElementPlus.ElMessage.error("Não foi possível carregar os dados do painel.");
        }
        this.loading = false;
    },
    watch: {
        users: {
            handler() { this.calculateUserCounts(); },
            deep: true
        }
    },
};