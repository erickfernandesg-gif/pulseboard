import TheSidebar from './TheSidebar.js';

const AppLayout = {
    components: {
        TheSidebar
    },
    template: `
        <div class="main-layout" :class="{ 'sidebar-is-open': isSidebarOpen }">
            <header class="mobile-header">
                <button @click="openSidebar" class="btn-icon">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <div class="logo-container-mobile">
                    <i class="fa-solid fa-square-poll-vertical"></i>
                    <h1>PulseBoard</h1>
                </div>
            </header>

            <div v-if="isSidebarOpen" @click="closeSidebar" class="sidebar-overlay"></div>

            <TheSidebar 
                :user="user" 
                :isAdmin="isAdmin" 
                :isOpen="isSidebarOpen"
                @close="closeSidebar" 
            />

            <main class="main-content">
                <router-view />
            </main>
        </div>
    `,
    data() {
        return {
            user: { name: 'Carregando...', email: '' },
            isAdmin: false,
            isSidebarOpen: false,
            db: firebase.firestore()
        }
    },
    methods: {
        openSidebar() { this.isSidebarOpen = true; },
        closeSidebar() { this.isSidebarOpen = false; }
    },
    created() {
        firebase.auth().onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                const userDoc = await this.db.collection('users').doc(firebaseUser.uid).get();
                if (userDoc.exists) {
                    this.user = userDoc.data();
                    this.isAdmin = this.user.isAdmin === true;
                }
            }
            // Não precisa mais de redirecionamento aqui, o router.js cuida disso
        });
    }
}