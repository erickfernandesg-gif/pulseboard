const TheSidebar = {
    props: ['user', 'isAdmin'],
    template: `
        <el-aside width="260px" class="sidebar">
            <div>
                <div class="sidebar-header">
                    <i class="fa-solid fa-square-poll-vertical"></i>
                    <h1>PulseBoard</h1>
                </div>
                <el-menu :default-active="$route.path" router>
                    <el-menu-item index="/dashboard"><i class="fa-solid fa-border-all"></i><span>Dashboard</span></el-menu-item>
                    <el-menu-item index="/resumo"><i class="fa-solid fa-chart-line"></i><span>Resumo Diário</span></el-menu-item>
                    <el-menu-item index="/analytics" v-if="isAdmin"><i class="fa-solid fa-chart-simple"></i><span>Analytics</span></el-menu-item>
                    <el-menu-item index="/admin" v-if="isAdmin"><i class="fa-solid fa-user-shield"></i><span>Admin</span></el-menu-item>
                </el-menu>
            </div>
            <div class="sidebar-footer">
                <div class="user-menu">
                    <div class="user-avatar">{{ userInitial }}</div>
                    <div class="user-info">
                        <span>{{ user.name }}</span>
                        <small>{{ user.email }}</small>
                    </div>
                    <el-button @click="logout" type="danger" icon="SwitchButton" circle plain title="Sair"/>
                </div>
            </div>
        </el-aside>
    `,
    computed: {
        userInitial() { return this.user && this.user.name ? this.user.name.charAt(0).toUpperCase() : '?'; }
    },
    methods: {
        logout() { firebase.auth().signOut().then(() => { this.$router.push('/login'); }); }
    }
};