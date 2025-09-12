const Resumo = {
    template: `
        <div class="main-content">
            <header class="page-header">
                <h1><i class="fa-solid fa-chart-line"></i> {{ pageTitle }}</h1>
            </header>
            
            <div v-loading="loading" class="summary-container">
                <el-empty v-if="!loading && Object.keys(summaryData).length === 0" description="Nenhum check-in encontrado para hoje." />

                <el-card v-for="(data, teamId) in summaryData" class="summary-card" :style="{ borderTop: '4px solid ' + (teams[teamId]?.color || '#ccc') }">
                    <template #header>
                        <div class="card-header">
                            <span>{{ teams[teamId]?.name || 'Time Desconhecido' }}</span>
                        </div>
                    </template>
                    
                    <div class="stats-container">
                        <div class="stat-item">
                            <i class="fa-solid fa-check-double"></i>
                            <div>
                                <span class="stat-value">{{ data.checkinCount }}</span>
                                <span class="stat-label">Total de Check-ins</span>
                            </div>
                        </div>

                        <div class="stat-item">
                            <i class="fa-solid fa-triangle-exclamation" :class="{ 'critical-alerts': data.criticalAlerts > 0 }"></i>
                            <div>
                                <span class="stat-value" :class="{ 'critical-alerts': data.criticalAlerts > 0 }">{{ data.criticalAlerts }}</span>
                                <span class="stat-label">Alertas Críticos</span>
                            </div>
                        </div>
                    </div>

                    <el-divider />
                    
                    <span class="stat-label">Principais Bloqueios Reportados:</span>
                    <el-timeline v-if="data.blockers.length > 0" style="padding-left: 5px; margin-top: 15px;">
                        <el-timeline-item v-for="(blocker, index) in data.blockers.slice(0, 3)" :key="index">
                        {{ blocker }}
                        </el-timeline-item>
                    </el-timeline>
                    <p v-else class="no-blockers"><small>Nenhum bloqueio reportado! 🎉</small></p>
                </el-card>
            </div>
        </div>
    `,
    data() {
        return {
            loading: true,
            teams: {},
            summaryData: {},
            pageTitle: 'Resumo do Dia',
            db: firebase.firestore(),
        }
    },
    methods: {
        async fetchTeams() {
            const snapshot = await this.db.collection('teams').get();
            let teamsData = {};
            snapshot.forEach(doc => {
                teamsData[doc.id] = doc.data();
            });
            this.teams = teamsData;
        },
        async loadDailySummary() {
            this.loading = true;
            const today = new Date();
            this.pageTitle = `Resumo do Dia – ${today.toLocaleDateString('pt-BR')}`;
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const snapshot = await this.db.collection('checkins')
                .where('timestamp', '>=', today)
                .where('timestamp', '<', tomorrow)
                .get();

            const processedData = {};
            snapshot.forEach(doc => {
                const checkin = doc.data();
                const teamId = checkin.teamId;
                if (!teamId || !this.teams[teamId]) return;

                if (!processedData[teamId]) {
                    processedData[teamId] = { checkinCount: 0, criticalAlerts: 0, blockers: [] };
                }

                processedData[teamId].checkinCount++;
                if (checkin.blockers && checkin.blockers.toLowerCase().trim() !== 'não' && checkin.blockers.toLowerCase().trim() !== 'nenhum') {
                    processedData[teamId].blockers.push(checkin.blockers);
                }
                if (checkin.alerts && (checkin.alerts.toLowerCase().includes('crítico') || checkin.alerts.includes('⚠️'))) {
                    processedData[teamId].criticalAlerts++;
                }
            });
            
            this.summaryData = processedData;
            this.loading = false;
        },
    },
    async mounted() {
        await this.fetchTeams();
        await this.loadDailySummary();
    }
}