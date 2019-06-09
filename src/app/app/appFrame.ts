import {Inject} from "typescript-ioc";
import Component from "vue-class-component";
import {SnotifyToast} from "vue-snotify";
import {namespace} from "vuex-class/lib/bindings";
import * as versionConfig from "../../version.json";
import {AddTradeDialog} from "../components/dialogs/addTradeDialog";
import {FeedbackDialog} from "../components/dialogs/feedbackDialog";
import {NotificationUpdateDialog} from "../components/dialogs/notificationUpdateDialog";
import {ErrorHandler} from "../components/errorHandler";
import {BottomNavigationBtn} from "../components/menu/bottomNavigationBtn";
import {BtnPortfolioSwitch} from "../components/menu/btnPortfolioSwitch";
import {NavigationList} from "../components/menu/navigationList";
import {ShowProgress} from "../platform/decorators/showProgress";
import {BtnReturn} from "../platform/dialogs/customDialog";
import {Storage} from "../platform/services/storage";
import {ClientInfo, ClientService} from "../services/clientService";
import {StoreKeys} from "../types/storeKeys";
import {Portfolio} from "../types/types";
import {NavBarItem} from "../types/types";
import {CommonUtils} from "../utils/commonUtils";
import {UiStateHelper} from "../utils/uiStateHelper";
import {MutationType} from "../vuex/mutationType";
import {StoreType} from "../vuex/storeType";
import {UI} from "./ui";

const MainStore = namespace(StoreType.MAIN);

@Component({
    // language=Vue
    template: `
        <v-app id="inspire" light>
            <vue-snotify></vue-snotify>
            <error-handler></error-handler>
            <template v-if="!loading && !loggedIn && !externalAuth">
                <v-content>
                    <v-container fluid fill-height>
                        <v-layout align-center justify-center>
                            <v-flex xs12 sm8 md4>
                                <v-card class="elevation-12">
                                    <v-toolbar color="primary">
                                        <v-toolbar-title>Вход</v-toolbar-title>
                                        <v-spacer></v-spacer>
                                    </v-toolbar>
                                    <v-card-text>
                                        <v-form>
                                            <v-text-field prepend-icon="person" name="login" label="Имя пользователя" type="text" required
                                                          v-model="username"></v-text-field>
                                            <v-text-field id="password" prepend-icon="lock" name="password" label="Пароль" required type="password"
                                                          v-model="password" @keydown.enter="login"></v-text-field>
                                        </v-form>
                                    </v-card-text>
                                    <v-card-actions>
                                        <v-spacer></v-spacer>
                                        <v-btn color="primary" @click="login">Вход</v-btn>
                                    </v-card-actions>
                                </v-card>
                            </v-flex>
                        </v-layout>
                    </v-container>
                </v-content>
            </template>

            <template v-if="!loading && (loggedIn || externalAuth)">
                <v-navigation-drawer disable-resize-watcher fixed stateless app class="sidebar" v-model="drawer" :mini-variant="mini" width="320">
                    <div>
                        <btn-portfolio-switch :mini="mini" :portfolio="portfolio" :clientInfo="clientInfo" @togglePanel="togglePanel"></btn-portfolio-switch>
                        <div v-if="!mini" :class="['wrap-toogle-menu-btn', 'small-screen-hide-toogle-menu-btn']">
                            <v-btn @click="togglePanel" fab dark small depressed color="#F0F3F8" :class="['toogle-menu-btn', publicZone ? 'public-toogle-menu-btn' : '']">
                                <v-icon dark>keyboard_arrow_left</v-icon>
                            </v-btn>
                        </div>
                        <navigation-list :mainSection="mainSection" :mini="mini" :settingsSelected="settingsSelected" @openDialog="openDialog"
                                         @goToOldVersion="goToOldVersion"></navigation-list>
                    </div>
                    <bottom-navigation-btn :publicZone="publicZone"></bottom-navigation-btn>
                </v-navigation-drawer>
                <v-content>
                    <div class="mobile-wrapper-menu">
                        <btn-portfolio-switch :mini="mini" :portfolio="portfolio" :clientInfo="clientInfo" @togglePanel="togglePanel" :isMobile="true"></btn-portfolio-switch>
                        <navigation-list :mainSection="mainSection" :mini="mini" :settingsSelected="settingsSelected" @openDialog="openDialog"
                                         @goToOldVersion="goToOldVersion" :class="mini ? 'part-mobile-menu' : ''"></navigation-list>
                        <bottom-navigation-btn :publicZone="publicZone" :class="mini ? 'part-mobile-menu' : ''"></bottom-navigation-btn>
                    </div>
                    <v-container fluid class="paddT0 fb-0">
                        <v-slide-y-transition mode="out-in">
                            <!--<keep-alive :include="cachedPages">-->
                            <router-view></router-view>
                            <!--</keep-alive>-->
                        </v-slide-y-transition>
                    </v-container>
                    <v-footer color="#f7f9fb" class="footer-app">
                        <v-layout class="footer-app-wrap-content" wrap align-center justify-space-between>
                            <div class="footer-app-wrap-content__text"><i class="far fa-copyright"></i> {{ copyrightInfo }}</div>

                            <div>
                                <a class="footer-app-wrap-content__text email-btn"
                                   @click.stop="openFeedBackDialog"><span>Напишите нам</span> <i class="fas fa-envelope"></i>
                                </a>

                                <a class="footer-app-wrap-content__text decorationNone" href="https://telegram.me/intelinvestSupportBot">
                                    <span>Telegram</span> <i class="fab fa-telegram"></i>
                                </a>
                            </div>
                        </v-layout>
                    </v-footer>
                </v-content>
            </template>
        </v-app>`,
    components: {ErrorHandler, FeedbackDialog, BtnPortfolioSwitch, NavigationList, BottomNavigationBtn}
})
export class AppFrame extends UI {

    @Inject
    private localStorage: Storage;
    @Inject
    private clientService: ClientService;
    @MainStore.Getter
    private clientInfo: ClientInfo;
    @MainStore.Getter
    private portfolio: Portfolio;

    @MainStore.Action(MutationType.SET_CLIENT_INFO)
    private loadUser: (clientInfo: ClientInfo) => Promise<void>;

    @MainStore.Action(MutationType.SET_CURRENT_PORTFOLIO)
    private setCurrentPortfolio: (id: string) => Promise<Portfolio>;

    @MainStore.Action(MutationType.RELOAD_PORTFOLIO)
    private reloadPortfolio: (id: number) => Promise<void>;

    @MainStore.Mutation(MutationType.CHANGE_SIDEBAR_STATE)
    private changeSideBarState: (sideBarState: boolean) => void;

    private username: string = null;

    private password: string = null;

    /**
     * Переменная используется только для удобства локальной разработки при тестировании с отдельным приложением лэндинга
     * Ддля PRODUCTION режима используется внешняя аутентификация с лэндинга
     */
    private externalAuth = true;
    private loggedIn = false;

    /* Пользователь уведомлен об обновлениях */
    private isNotifyAccepted = false;

    /**
     * Названия кэшируемых компонентов (страниц). В качестве названия необходимо указывать либо имя файла компонента (это его name)
     * или название компонента если он зарегистрирован в uiRegistry через UI.component.
     * Необходимые действия выполняются в хуках activated и deactivated кешируемого компонента.
     * @type {string[]}
     */
    private cachedPages = ["PortfolioPage"];

    private drawer = true;

    private mini = true;
    private loading = false;

    private mainSection: NavBarItem[] = [
        {title: "Портфель", action: "portfolio", icon: "fas fa-briefcase"},
        {title: "Сделки", action: "trades", icon: "fas fa-list-alt"},
        {title: "События", action: "events", icon: "far fa-calendar-check"},
        {title: "Дивиденды", action: "dividends", icon: "far fa-calendar-plus"},
        {title: "Составной портфель", action: "combined-portfolio", icon: "fas fa-object-group"},
        // Закомментировано для первого релиза
        {title: "Котировки", action: "quotes", icon: "fas fa-chart-area"},
        {title: "Информация", path: "/share-info", icon: "fas fa-info"},
        {
            title: "Настройки", icon: "fas fa-cog", action: "settings", subMenu: [
                {title: "Управление портфелями", action: "portfolio-management", icon: "fas fa-suitcase"},
                {title: "Импорт сделок", action: "import", icon: "fas fa-download"},
                {title: "Экспорт сделок", action: "export", icon: "fas fa-upload"},
                {title: "Тарифы", action: "tariffs", icon: "fas fa-credit-card"},
                {title: "Промокоды", action: "promo-codes", icon: "fas fa-heart"},
                {title: "Уведомления", action: "notifications", icon: "fas fa-bell"}
            ]
        },
        {title: "Справка", action: "help", icon: "far fa-question-circle"},
        {title: "Выход", action: "logout", icon: "exit_to_app"}
    ];

    @ShowProgress
    async created(): Promise<void> {
        // если стор не прогружен, это не публичная зона и это не переход по авторизации, пробуем загрузить информацию о клиенте
        if (!CommonUtils.exists(this.$store.state[StoreType.MAIN].clientInfo) && this.externalAuth && !this.publicZone) {
            await this.startup();
        }
        // если удалось восстановить state, значит все уже загружено
        if (this.$store.state[StoreType.MAIN].clientInfo) {
            if (!this.publicZone) {
                this.isNotifyAccepted = UiStateHelper.lastUpdateNotification === NotificationUpdateDialog.DATE;
                this.showUpdatesMessage();
            }
            this.loggedIn = true;
        }
    }

    private async startup(): Promise<void> {
        this.loading = true;
        try {
            const client = await this.clientService.getClientInfo();
            await this.loadUser({token: this.localStorage.get(StoreKeys.TOKEN_KEY, null), user: client});
            await this.setCurrentPortfolio(this.$store.state[StoreType.MAIN].clientInfo.user.currentPortfolioId);
        } finally {
            this.loading = false;
        }
    }

    private async login(): Promise<void> {
        if (!this.username || !this.password) {
            this.$snotify.warning("Заполните поля");
            return;
        }
        const clientInfo = await this.clientService.login({username: this.username, password: this.password});
        await this.loadUser(clientInfo);
        await this.setCurrentPortfolio(this.$store.state[StoreType.MAIN].clientInfo.user.currentPortfolioId);
        this.loggedIn = true;
    }

    private async openDialog(): Promise<void> {
        const result = await new AddTradeDialog().show({store: this.$store.state[StoreType.MAIN], router: this.$router});
        if (result) {
            await this.reloadPortfolio(this.portfolio.id);
        }
    }

    /**
     * Отображает уведомление об обновлениях
     * Только для приватной зоны
     */
    private showUpdatesMessage(): void {
        if (!this.isNotifyAccepted && !this.publicZone) {
            this.$snotify.info("Мы улучшили сервис для Вас, ознакомьтесь с обновлениями", {
                closeOnClick: false,
                timeout: 0,
                buttons: [{
                    text: "Подробнее", action: async (toast: SnotifyToast): Promise<void> => {
                        this.$snotify.remove(toast.id);
                        await this.openNotificationUpdateDialog();
                    }
                }]
            });
        }
    }

    private async openNotificationUpdateDialog(): Promise<void> {
        const dlgReturn = await new NotificationUpdateDialog().show();
        if (dlgReturn === BtnReturn.YES) {
            UiStateHelper.lastUpdateNotification = NotificationUpdateDialog.DATE;
            this.isNotifyAccepted = true;
        } else if (dlgReturn === BtnReturn.SHOW_FEEDBACK) {
            await new FeedbackDialog().show(this.clientInfo);
        }
    }

    private async openFeedBackDialog(): Promise<void> {
        await new FeedbackDialog().show(this.clientInfo);
    }

    /**
     * Переключает на старую версию приложения
     */
    private async goToOldVersion(): Promise<void> {
        window.location.assign(`https://old.intelinvest.ru/portfolio`);
    }

    private togglePanel(): void {
        this.mini = !this.mini;
        this.changeSideBarState(this.mini);
    }

    private get actualYear(): string {
        return String(new Date().getFullYear());
    }

    private get copyrightInfo(): string {
        return `Intelligent Investments 2012-${this.actualYear} версия ${versionConfig.version} сборка ${versionConfig.build} от ${versionConfig.date}`;
    }

    private get settingsSelected(): boolean {
        return this.$route.path.indexOf("settings") !== -1;
    }

    private get publicZone(): boolean {
        return this.$route.meta.public;
    }
}
