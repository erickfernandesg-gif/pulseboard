const Analytics ={
    template: `
        <div class="main-content">
             <header class="page-header">
                <h1><i class="fa-solid fa-chart-simple"></i> Analytics e Tendências</h1>
                <el-select v-model="timeRange" @change="fetchData" style="width: 200px;">
                    <el-option label="Últimos 7 dias" :value="7"></el-option>
                    <el-option label="Últimos 30 dias" :value="30"></el-option>
                    <el-option label="Últimos 90 dias" :value="90"></el-option>
                </el-select>
            </header>

            <div v-loading="loading" class="analytics-container">
                <el-empty v-if="!loading && checkins.length === 0" description="Nenhum dado encontrado para o período selecionado." />

                <div v-else class="analytics-grid">
                    <el-card class="analytics-card">
                        <template #header>
                            <h2><i class="fa-solid fa-cloud"></i> Nuvem de Palavras de Bloqueios</h2>
                        </template>
                        <div v-if="wordCloud.length > 0" class="word-cloud">
                            <span v-for="word in wordCloud" :style="{ fontSize: word.size + 'px', opacity: word.opacity, color: word.color }">{{ word.text }}</span>
                        </div>
                        <el-empty v-else description="Nenhum bloqueio significativo." :image-size="80"></el-empty>
                    </el-card>

                    <el-card class="analytics-card full-width">
                        <template #header>
                            <h2><i class="fa-solid fa-face-smile"></i> Tendência de Sentimento da Equipe</h2>
                        </template>
                        <canvas id="sentimentChart"></canvas>
                    </el-card>

                    <el-card class="analytics-card">
                        <template #header>
                            <h2><i class="fa-solid fa-award"></i> Membros Mais Reconhecidos</h2>
                        </template>
                        <el-empty v-if="kudosRanking.length === 0" description="Nenhum reconhecimento." :image-size="80"></el-empty>
                        <ol v-else class="kudos-rank">
                            <li v-for="member in kudosRanking">
                                <span class="member-name">{{ member.name }}</span>
                                <span class="kudos-count">{{ member.kudosCount }} <i class="fa-solid fa-hands-clapping"></i></span>
                            </li>
                        </ol>
                    </el-card>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            loading: true,
            checkins: [],
            timeRange: 30,
            allUsers: {},
            wordCloud: [],
            kudosRanking: [],
            sentimentChart: null,
            db: firebase.firestore(),
            auth: firebase.auth(),
            user: null,
        }
    },
    methods: {
        async fetchAllUsers() {
            if (!this.user || !this.user.organizationId) return;
            const snapshot = await this.db.collection('users')
                .where('organizationId', '==', this.user.organizationId)
                .get();
            snapshot.forEach(doc => {
                this.allUsers[doc.id] = doc.data();
            });
        },
        async fetchData() {
            this.loading = true;
            if (!this.user || !this.user.organizationId) {
                this.loading = false;
                return;
            }
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - this.timeRange);
            startDate.setHours(0, 0, 0, 0);

            const snapshot = await this.db.collection('checkins')
                .where('organizationId', '==', this.user.organizationId)
                .where('timestamp', '>=', startDate)
                .get();
            
            this.checkins = snapshot.docs.map(doc => doc.data());

            this.processWordCloud();
            const chartData = this.processSentiment();
            this.processKudos();

            this.loading = false;

            this.$nextTick(() => {
                this.renderSentimentChart(chartData.labels, chartData.data);
            });
        },
        processWordCloud() {
            const wordCounts = {};
            const stopWords = new Set(['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'na', 'por', 'mais', 'se', 'eu', 'meu', 'minha', 'estou', 'está', 'ele', 'ela', 'mas', 'foi', 'ser', 'tem', 'tenho', 'pelo', 'pela', 'à', 'sem', 'ou', 'como', 'já', 'quando', 'quem', 'onde', 'porque', 'pois', 'então', 'isso', 'esse', 'essa', 'este', 'esta', 'muito', 'pouco', 'mesmo', 'só', 'são', 'fazer', 'coisa', 'ainda', 'ter', 'preciso', 'nenhum', 'nenhuma', 'impedimento']);

            this.checkins.forEach(c => {
                if (c.blockers) {
                    const words = c.blockers.toLowerCase().match(/\b(\w+)\b/g) || [];
                    words.forEach(word => {
                        if (word.length > 2 && !stopWords.has(word)) {
                            wordCounts[word] = (wordCounts[word] || 0) + 1;
                        }
                    });
                }
            });

            const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
            if (sortedWords.length === 0) {
                this.wordCloud = [];
                return;
            }
            
            const maxCount = sortedWords[0][1];
            const colorPalette = ['#4A90E2', '#50E3C2', '#F5A623', '#E74C3C', '#9B59B6'];

            this.wordCloud = sortedWords.slice(0, 25).map(([text, count], index) => ({
                text,
                count,
                size: 14 + (count / maxCount) * 36,
                opacity: 0.6 + (count / maxCount) * 0.4,
                color: colorPalette[index % colorPalette.length]
            }));
        },
        processSentiment() {
            const sentimentByDay = {};
            const moodScores = { sad: 1, neutral: 3, happy: 5 };

            this.checkins.forEach(c => {
                if(c.timestamp && c.mood) {
                    const date = c.timestamp.toDate().toLocaleDateString('pt-BR');
                    if (!sentimentByDay[date]) {
                        sentimentByDay[date] = { total: 0, count: 0 };
                    }
                    sentimentByDay[date].total += moodScores[c.mood] || 3;
                    sentimentByDay[date].count++;
                }
            });

            const labels = Object.keys(sentimentByDay).sort((a, b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
            const data = labels.map(label => sentimentByDay[label].total / sentimentByDay[label].count);

            return { labels, data };
        },
        renderSentimentChart(labels, data) {
            const canvas = document.getElementById('sentimentChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            if (this.sentimentChart) {
                this.sentimentChart.destroy();
            }

            this.sentimentChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Média de Sentimento da Equipe',
                        data: data,
                        borderColor: 'rgba(74, 144, 226, 1)',
                        backgroundColor: 'rgba(74, 144, 226, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } } } }
            });
        },
        processKudos() {
            const kudosCounts = {};
            this.checkins.forEach(c => {
                if(c.kudos && c.kudos.length > 0) {
                    const recipientId = c.userId;
                    kudosCounts[recipientId] = (kudosCounts[recipientId] || 0) + c.kudos.length;
                }
            });

            this.kudosRanking = Object.entries(kudosCounts)
                .map(([userId, kudosCount]) => ({
                    userId,
                    kudosCount,
                    name: this.allUsers[userId]?.name || 'Usuário Desconhecido'
                }))
                .sort((a, b) => b.kudosCount - a.kudosCount)
                .slice(0, 10);
        },
    },
    async mounted() {
        this.loading = true;
        try {
            const firebaseUser = this.auth.currentUser;
            if (!firebaseUser) {
                this.loading = false;
                return;
            }
            const userDoc = await this.db.collection('users').doc(firebaseUser.uid).get();
            if (userDoc.exists) {
                this.user = { uid: firebaseUser.uid, ...userDoc.data() };
                await this.fetchAllUsers();
                await this.fetchData();
            } else {
                console.error("User document not found in Firestore.");
            }
        } catch (error) {
            console.error("Error loading analytics data:", error);
        }
        this.loading = false;
    }
}