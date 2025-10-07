const App = {
    template: `
        <div v-if="isAuthenticated" class="app-layout">
            <el-header class="main-header">
                <div class="header-left">
                    <el-button @click="drawerOpen = true" icon="Menu" circle text />
                    <div class="logo">
                        <i class="fa-solid fa-square-poll-vertical"></i>
                        <span>PulseBoard</span>
                    </div>
                </div>
                <div class="header-right">
                    <el-button @click="$router.push('/dashboard?action=checkin')" type="primary" icon="Plus">Fazer Check-in</el-button>
                    <el-dropdown>
                        <span class="user-avatar">{{ userInitial }}</span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item disabled>
                                    <strong>{{ userProfile.name }}</strong><br>
                                    <small>{{ userProfile.email }}</small>
                                </el-dropdown-item>
                                <el-dropdown-item divided @click="logout" icon="SwitchButton">Sair</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </el-header>

            <el-drawer v-model="drawerOpen" title="Navegação" direction="ltr" size="280px">
                <el-menu :default-active="$route.path" router @select="drawerOpen = false">
                    <el-menu-item index="/dashboard"><i class="fa-solid fa-border-all"></i><span>Dashboard</span></el-menu-item>
                    <el-menu-item index="/resumo"><i class="fa-solid fa-chart-line"></i><span>Resumo Diário</span></el-menu-item>                    
                    <!-- Link para o admin da empresa -->
                    <el-menu-item index="/company-admin" v-if="userProfile.role === 'admin'"><i class="fa-solid fa-building-user"></i><span>Gerenciar Empresa</span></el-menu-item>
                    <el-menu-item index="/analytics" v-if="userProfile.isSuperAdmin || userProfile.role === 'admin'"><i class="fa-solid fa-chart-simple"></i><span>Analytics</span></el-menu-item>
                    <!-- Link apenas para Super Admin -->
                    <el-menu-item index="/admin" v-if="userProfile.isSuperAdmin"><i class="fa-solid fa-user-shield"></i><span>Admin Geral</span></el-menu-item>
                </el-menu>
            </el-drawer>

            <el-main class="main-content">
                <router-view></router-view>
            </el-main>
        </div>

        <router-view v-else></router-view>
    `,
    props: ['userProfile'], // Recebe o perfil do main.js
    data() {
        return {
            isAuthenticated: false,
            drawerOpen: false,
        }
    },
    computed: {
        userInitial() { return this.userProfile && this.userProfile.name ? this.userProfile.name.charAt(0).toUpperCase() : '?'; }
    },
    methods: {
        logout() { firebase.auth().signOut().then(() => { this.$router.push('/login'); }); }
    },
    mounted() {
        // A autenticação agora é controlada pelo onAuthStateChanged no main.js
        // e o perfil é passado como prop.
        this.isAuthenticated = !!this.userProfile;
    }
};