const Dashboard = {
    template: `
        <div class="main-content">
            <header class="page-header">
                <h1><i class="fa-solid fa-border-all"></i> Dashboard Geral</h1>
                <div class="actions">
                    <el-button @click="openGoalsModal" :icon="'Trophy'">Minhas Metas</el-button>
                    <el-button type="primary" @click="openCheckinModal" :icon="'Plus'">Fazer Check-in</el-button>
                </div>
            </header>
            
            <div class="filters-toolbar">
                <el-input v-model="searchTerm" placeholder="Buscar por palavra-chave..." :prefix-icon="'Search'" clearable />
                <el-select v-model="selectedTeam" placeholder="Filtrar por time" clearable>
                    <el-option label="Todos os Times" value="all"></el-option>
                    <el-option v-for="(team, id) in teams" :key="id" :label="team.name" :value="id"></el-option>
                </el-select>
            </div>

            <div v-loading="loading" class="checkin-feed">
                 <el-empty v-if="!loading && filteredCheckins.length === 0" description="Nenhum check-in encontrado para esta seleção." />
                
                <el-card v-for="checkin in filteredCheckins" class="checkin-card" :style="{ borderLeftColor: teams[checkin.teamId]?.color || '#ccc' }">
                    <template #header>
                        <div class="card-header">
                            <div class="card-user">
                                <span class="mood-icon">{{ getMoodIcon(checkin.mood) }}</span>
                                <strong>{{ checkin.userName }}</strong>
                                <span v-if="teams[checkin.teamId]">| {{ teams[checkin.teamId].name }}</span>
                            </div>
                            <span class="card-timestamp">{{ formatTimestamp(checkin.timestamp) }}</span>
                        </div>
                    </template>
                    <div class="card-content">
                        <p>
                            <strong><i class="fa-solid fa-bullseye icon-focus"></i> Foco:</strong>
                            <el-tooltip v-if="checkin.linkedGoalId" :content="getGoalText(checkin.linkedGoalId)" placement="top">
                                <span class="goal-link-indicator">🎯</span>
                            </el-tooltip>
                            {{ checkin.focus }}
                        </p>
                        <p><strong><i class="fa-solid fa-road-block icon-blocker"></i> Bloqueios:</strong> {{ checkin.blockers }}</p>
                        <el-alert v-if="checkin.alerts" :title="checkin.alerts" :type="isCritical(checkin.alerts) ? 'error' : 'warning'" show-icon :closable="false" />
                    </div>
                    
                    <div class="card-footer">
                        <el-button @click="giveKudos(checkin.id)" :type="hasGivenKudos(checkin) ? 'success' : ''" round :disabled="isMyCheckin(checkin)">
                            <i class="fa-solid fa-hands-clapping"></i>&nbsp;
                            <span>{{ hasGivenKudos(checkin) ? 'Aplaudiu!' : 'Aplaudir' }}</span>
                        </el-button>
                        <div class="kudos-display" v-if="checkin.kudos && checkin.kudos.length > 0">
                            <i class="fa-solid fa-hands-clapping kudos-icon-given"></i>
                            <span>{{ checkin.kudos.length }}</span>
                        </div>
                        <el-button v-if="isAdmin" @click="confirmDeleteCheckin(checkin.id)" type="danger" :icon="'Delete'" circle plain title="Excluir Check-in" />
                    </div>
                </el-card>
            </div>
            
            <el-dialog v-model="showModal" title="Check-in do Dia" width="550px" top="5vh">
                <el-form :model="newCheckin" label-position="top">
                    <el-form-item label="Como você está se sentindo hoje?">
                        <el-radio-group v-model="newCheckin.mood">
                            <el-radio-button label="happy">😊 Feliz</el-radio-button>
                            <el-radio-button label="neutral">🙂 Normal</el-radio-button>
                            <el-radio-button label="sad">😟 Com Dificuldades</el-radio-button>
                        </el-radio-group>
                    </el-form-item>
                    <el-form-item label="Qual é o seu foco principal para hoje?">
                        <el-input v-model="newCheckin.focus" type="textarea" :rows="3" required />
                    </el-form-item>
                    <el-form-item v-if="userGoals.length > 0" label="Vincular a uma meta da semana (opcional)">
                        <el-select v-model="newCheckin.linkedGoalId" placeholder="Nenhuma" clearable>
                            <el-option v-for="goal in userGoals" :key="goal.id" :label="goal.goalText" :value="goal.id"></el-option>
                        </el-select>
                    </el-form-item>
                    <el-form-item label="O que está te impedindo de progredir?">
                        <el-input v-model="newCheckin.blockers" type="textarea" :rows="3" placeholder="Ex: Aguardando dados do financeiro, sistema CRM instável..." required />
                    </el-form-item>
                     <el-form-item label="Algum aviso ou ponto de atenção para a equipe? (Opcional)">
                        <el-input v-model="newCheckin.alerts" placeholder="Ex: O prazo do projeto X termina hoje!, O servidor ficará offline às 15h." />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="closeCheckinModal">Cancelar</el-button>
                    <el-button type="primary" @click="submitCheckin">Enviar Check-in</el-button>
                </template>
            </el-dialog>

            <el-dialog v-model="showGoalsModal" title="Minhas Metas da Semana" width="550px" top="5vh">
                <el-form @submit.prevent="addGoal">
                    <el-form-item>
                        <el-input v-model="newGoalText" placeholder="Escreva uma nova meta..." required>
                            <template #append>
                                <el-button type="primary" native-type="submit" :icon="'Plus'">Adicionar</el-button>
                            </template>
                        </el-input>
                    </el-form-item>
                </el-form>
                <div class="goals-list">
                    <el-empty v-if="userGoals.length === 0" description="Nenhuma meta definida."></el-empty>
                    <div v-for="goal in userGoals" class="admin-list-item">
                        <span>{{ goal.goalText }}</span>
                        <el-button @click="deleteGoal(goal.id)" type="danger" :icon="'Delete'" circle plain />
                    </div>
                </div>
            </el-dialog>
        </div>
    `,
    data() {
        return {
            user: { uid: null, name: 'Carregando...', teamId: null, organizationId: null },
            isAdmin: false,
            loading: true,
            teams: {},
            allCheckins: [],
            searchTerm: '',
            selectedTeam: 'all',
            showModal: false,
            showGoalsModal: false,
            userGoals: [],
            newGoalText: '',
            newCheckin: { focus: '', blockers: '', alerts: '', mood: 'neutral', linkedGoalId: '' },
            unsubscribe: null,
            auth: firebase.auth(),
            db: firebase.firestore(),
        }
    },
    computed: {
        filteredCheckins() {
            let checkins = this.allCheckins;
            if (this.searchTerm) {
                const term = this.searchTerm.toLowerCase();
                checkins = checkins.filter(c => 
                    c.userName.toLowerCase().includes(term) ||
                    c.focus.toLowerCase().includes(term) ||
                    c.blockers.toLowerCase().includes(term) ||
                    (c.alerts && c.alerts.toLowerCase().includes(term))
                );
            }
            if (this.selectedTeam && this.selectedTeam !== 'all') {
                checkins = checkins.filter(c => c.teamId === this.selectedTeam);
            }
            return checkins;
        }
    },
    methods: {
        getWeekId(date) { const d = new Date(date); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 4 - (d.getDay() || 7)); const yearStart = new Date(d.getFullYear(), 0, 1); const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7); return `${d.getFullYear()}-${weekNo}`; },
        openGoalsModal() { this.showGoalsModal = true; },
        closeGoalsModal() { this.showGoalsModal = false; },
        async fetchUserGoals() { if (!this.user.uid) return; const currentWeekId = this.getWeekId(new Date()); const snapshot = await this.db.collection('goals').where('userId', '==', this.user.uid).where('weekId', '==', currentWeekId).orderBy('createdAt', 'desc').get(); this.userGoals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); },
        async addGoal() {
            if (this.newGoalText.trim() === '') return;
            if (this.userGoals.length >= 3) { ElementPlus.ElMessage.warning('Você pode definir no máximo 3 metas por semana.'); return; }
            const newGoal = {
                userId: this.user.uid,
                goalText: this.newGoalText,
                weekId: this.getWeekId(new Date()),
                organizationId: this.user.organizationId, // <-- CARIMBO ADICIONADO
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await this.db.collection('goals').add(newGoal);
            this.newGoalText = '';
            await this.fetchUserGoals();
        },
        async deleteGoal(goalId) {
            await this.db.collection('goals').doc(goalId).delete();
            await this.fetchUserGoals();
            ElementPlus.ElMessage({ message: 'Meta removida!', type: 'success' });
        },
        getGoalText(goalId) { const goal = this.userGoals.find(g => g.id === goalId); return goal ? goal.goalText : 'Meta não encontrada'; },
        async fetchTeams() { if (!this.user.organizationId) return; const snapshot = await this.db.collection('teams').where('organizationId', '==', this.user.organizationId).get(); let teamsData = {}; snapshot.forEach(doc => { teamsData[doc.id] = doc.data(); }); this.teams = teamsData; },
        loadCheckins() {
            if (this.unsubscribe) this.unsubscribe();
            if (!this.user.organizationId) {
                this.loading = false;
                return;
            }
            const query = this.db.collection('checkins')
                .where('organizationId', '==', this.user.organizationId)
                .orderBy('timestamp', 'desc').limit(50);
            this.unsubscribe = query.onSnapshot(snapshot => {
                this.allCheckins = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return { id: doc.id, kudos: [], ...data };
                });
                this.loading = false;
            }, error => {
                console.error("Erro ao buscar check-ins:", error);
                this.loading = false;
            });
        },
        confirmDeleteCheckin(checkinId) {
            ElementPlus.ElMessageBox.confirm('Esta ação não pode ser revertida. Continuar?', 'Você tem certeza?', { confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar', type: 'warning' })
                .then(() => { this.deleteCheckin(checkinId); })
                .catch(() => {});
        },
        async deleteCheckin(checkinId) {
            await this.db.collection('checkins').doc(checkinId).delete();
            ElementPlus.ElMessage({ message: 'O check-in foi removido.', type: 'success' });
        },
        openCheckinModal() { this.fetchUserGoals(); this.showModal = true; },
        closeCheckinModal() { this.showModal = false; },
        setMood(mood) { this.newCheckin.mood = mood; },
        async submitCheckin() {
            if (!this.newCheckin.focus || !this.newCheckin.blockers) return;
            const checkinData = {
                ...this.newCheckin,
                userId: this.user.uid,
                userName: this.user.name,
                teamId: this.user.teamId,
                organizationId: this.user.organizationId, // <-- CARIMBO ADICIONADO
                kudos: [],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            await this.db.collection('checkins').add(checkinData);
            this.closeCheckinModal();
            this.newCheckin = { focus: '', blockers: '', alerts: '', mood: 'neutral', linkedGoalId: '' };
            ElementPlus.ElNotification({ title: 'Sucesso', message: 'Seu check-in foi registrado.', type: 'success', position: 'bottom-right' });
        },
        async giveKudos(checkinId) { const checkinRef = this.db.collection('checkins').doc(checkinId); await checkinRef.update({ kudos: firebase.firestore.FieldValue.arrayUnion(this.user.uid) }); },
        hasGivenKudos(checkin) { return checkin.kudos && checkin.kudos.includes(this.user.uid); },
        isMyCheckin(checkin) { return checkin.userId === this.user.uid; },
        getMoodIcon(mood) { const icons = { happy: '😊', neutral: '🙂', sad: '😟' }; return icons[mood] || ''; },
        formatTimestamp(ts) { if (!ts) return ''; return ts.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); },
        isCritical(alerts) { if (!alerts) return false; return ['crítico', 'urgente', 'bloqueio total', '⚠️'].some(keyword => alerts.toLowerCase().includes(keyword)); }
    },
    async mounted() {
        try {
            const firebaseUser = this.auth.currentUser;
            if (firebaseUser) {
                const userDoc = await this.db.collection('users').doc(firebaseUser.uid).get();
                if (userDoc.exists) {
                    this.user = { uid: firebaseUser.uid, ...userDoc.data() };
                    this.isAdmin = this.user.isSuperAdmin === true || this.user.role === 'admin' || this.user.role === 'team_lead';
                    await Promise.all([this.fetchTeams(), this.fetchUserGoals()]);
                    this.loadCheckins();
                } else {
                    this.auth.signOut();
                }
            }
        } catch (error) {
            console.error("Erro ao montar o Dashboard:", error);
            ElementPlus.ElMessage.error('Não foi possível carregar os dados do dashboard.');
        }
    }
}