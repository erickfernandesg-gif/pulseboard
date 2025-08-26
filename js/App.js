const App = {
    components: {
        'TheSidebar': TheSidebar
    },
    template: `
        <div v-if="isAuthenticated" class="main-layout">
            <TheSidebar :user="userProfile" :isAdmin="isAdmin" />
            <el-main class="main-content">
                <router-view></router-view>
            </el-main>
        </div>
        <router-view v-else></router-view>
    `,
    data() {
        return {
            isAuthenticated: false,
            userProfile: {},
            isAdmin: false,
            db: firebase.firestore()
        }
    },
    created() {
        firebase.auth().onAuthStateChanged(async (user) => {
            this.isAuthenticated = !!user;
            if (user) {
                const userDoc = await this.db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    this.userProfile = userDoc.data();
                    this.isAdmin = this.userProfile.isAdmin === true;
                }
            }
        });
    }
};