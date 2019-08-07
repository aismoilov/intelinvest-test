import dayjs from "dayjs";
import {Container} from "typescript-ioc";
import Vue from "vue";
import VueRouter, {Route} from "vue-router";
import {RouteConfig} from "vue-router/types/router";
import {Resolver} from "../../../typings/vue";
import {AuthComponent} from "../app/authComponent";
import {TariffExpiredDialog} from "../components/dialogs/tariffExpiredDialog";
import {AdviserPage} from "../pages/adviser/adviserPage";
import {BalancesPage} from "../pages/balancesPage";
import {BondInfoPage} from "../pages/bondInfoPage";
import {CombinedPortfolioPage} from "../pages/combinedPortfolioPage";
import {DividendsPage} from "../pages/dividendsPage";
import {EventsPage} from "../pages/eventsPage";
import {HelpPage} from "../pages/helpPage";
import {PortfolioPage} from "../pages/portfolioPage";
import {QuotesPage} from "../pages/quotes/quotesPage";
import {ExportPage} from "../pages/settings/exportPage";
import {ImportPage} from "../pages/settings/importPage";
import {NotificationsPage} from "../pages/settings/notificationsPage";
import {PortfoliosManagementPage} from "../pages/settings/portfoliosManagementPage";
import {ProfilePage} from "../pages/settings/profilePage";
import {PromoCodesPage} from "../pages/settings/promoCodesPage";
import {SettingsPage} from "../pages/settings/settingsPage";
import {TariffsPage} from "../pages/settings/tariffsPage";
import {ShareInfoPage} from "../pages/shareInfoPage";
import {TradesPage} from "../pages/tradesPage";
import {Storage} from "../platform/services/storage";
import {ClientService} from "../services/clientService";
import {LogoutService} from "../services/logoutService";
import {StoreKeys} from "../types/storeKeys";
import {Tariff} from "../types/tariff";
import {CommonUtils} from "../utils/commonUtils";
import {DateUtils} from "../utils/dateUtils";
import {VuexConfiguration} from "../vuex/vuexConfiguration";

Vue.use(VueRouter);

/** Сервис работы с клиентом */
const clientService: ClientService = Container.get(ClientService);
/** Сервис работы с localStorage */
const localStorage: Storage = Container.get(Storage);
/** Стор приложения */
const store = VuexConfiguration.getStore();

/**
 * Класс отвечающий за создание роутингов и инициализацию роутера
 */
export class RouterConfiguration {

    /** Экземпляр роутера */
    private static router: VueRouter;

    /**
     * Возвращает инициализированный экземпляр роутера
     * @returns {VueRouter} роутер
     */
    static getRouter(): VueRouter {
        if (!RouterConfiguration.router) {
            RouterConfiguration.router = new VueRouter({
                base: "/",
                routes: RouterConfiguration.createRoutes(),
                scrollBehavior: ((): any => ({x: 0, y: 0}))
            });
            RouterConfiguration.router.beforeEach(async (to: Route, from: Route, next: Resolver): Promise<void> => {
                // добавляем meta-тэги
                RouterConfiguration.renderMetaTags(to);
                const authorized = !!localStorage.get(StoreKeys.TOKEN_KEY, null);
                if (!to.meta.public && !authorized) {
                    next(false);
                    return;
                }
                const client = await clientService.getClientInfo();
                next();
                // скрываем меню в мобильном виде при переходе
                if (CommonUtils.isMobile()) {
                    (store as any).state.MAIN.sideBarOpened = true;
                }
                // осуществляем переход по роуту и если пользователь залогинен отображаем диалог об истечении тарифа при соблюдении условий
                const tariffAllowed = (to.meta as RouteMeta).tariffAllowed;
                if (!tariffAllowed && authorized) {
                    const tariffExpired = client.tariff !== Tariff.FREE && DateUtils.parseDate(client.paidTill).isBefore(dayjs());

                    if (tariffExpired) {
                        await new TariffExpiredDialog().show(RouterConfiguration.router);
                    }
                }
            });
        }
        return RouterConfiguration.router;
    }

    private static createRoutes(): RouteConfig[] {
        return [
            {
                path: "/logout",
                name: "logout",
                meta: {tariffAllowed: true},
                beforeEnter: (): Promise<void> => (Container.get(LogoutService) as LogoutService).logout()
            },
            {
                path: "*",
                redirect: "/portfolio"
            },
            {
                name: "auth",
                path: "/auth/:token",
                meta: {public: true},
                component: AuthComponent
            },
            {
                name: "portfolio",
                path: "/portfolio",
                component: PortfolioPage,
                meta: {
                    tariffAllowed: true,
                    title: "Портфель"
                }
            },
            {
                name: "adviser",
                path: "/adviser",
                meta: {
                    tariffAllowed: true,
                    title: "Аналитика"
                },
                component: AdviserPage,
            },
            {
                name: "events",
                path: "/events",
                component: EventsPage,
                meta: {
                    title: "События"
                }
            },
            {
                name: "dividends",
                path: "/dividends",
                component: DividendsPage,
                meta: {
                    title: "Дивиденды"
                }
            },
            {
                name: "trades",
                path: "/trades",
                component: TradesPage,
                meta: {
                    tariffAllowed: true,
                    title: "Сделки"
                }
            },
            {
                name: "combined-portfolio",
                path: "/combined-portfolio",
                component: CombinedPortfolioPage,
                meta: {
                    tariffAllowed: true,
                    title: "Составной портфель"
                }
            },
            {
                name: "quotes",
                path: "/quotes",
                meta: {
                    tariffAllowed: true,
                    title: "Котировки"
                },
                component: QuotesPage,
            },
            {
                path: "/share-info",
                meta: {tariffAllowed: true},
                redirect: "/share-info/GAZP"
            },
            {
                path: "/share-info/:ticker",
                component: ShareInfoPage,
                children: [
                    {
                        path: "",
                        name: "share",
                        meta: {
                            tariffAllowed: true,
                            title: "Информация по бумаге"
                        },
                        component: ShareInfoPage
                    }
                ],
            },
            {
                name: "bond-info",
                meta: {
                    tariffAllowed: true,
                    title: "Информация по бумаге"
                },
                path: "/bond-info/:isin",
                component: BondInfoPage
            },
            {
                name: "settings",
                path: "/settings",
                component: SettingsPage,
                redirect: "/settings/portfolio-management",
                children: [
                    {
                        name: "portfolio-management",
                        path: "/settings/portfolio-management",
                        meta: {
                            tariffAllowed: true,
                            title: "Управление портфелями"
                        },
                        component: PortfoliosManagementPage
                    },
                    {
                        name: "export",
                        path: "export",
                        component: ExportPage,
                        meta: {
                            title: "Экспорт сделок"
                        }
                    },
                    {
                        name: "import",
                        path: "import",
                        component: ImportPage,
                        meta: {
                            title: "Импорт сделок"
                        }
                    },
                    {
                        name: "tariffs",
                        path: "tariffs/",
                        meta: {
                            tariffAllowed: true,
                            title: "Тарифы"
                        },
                        component: TariffsPage
                    },
                    {
                        name: "tariffs_status",
                        path: "tariffs/:status",
                        meta: {
                            tariffAllowed: true,
                            title: "Тарифы"
                        },
                        component: TariffsPage
                    },
                    {
                        name: "promo-codes",
                        path: "promo-codes",
                        meta: {
                            tariffAllowed: true,
                            title: "Партнерская программа"
                        },
                        component: PromoCodesPage
                    },
                    {
                        name: "notifications",
                        path: "notifications",
                        component: NotificationsPage,
                        meta: {
                            title: "Уведомления"
                        }
                    },
                ]
            },
            {
                name: "profile",
                path: "/profile",
                meta: {
                    tariffAllowed: true,
                    title: "Профиль"
                },
                component: ProfilePage
            },
            {
                name: "help",
                path: "/help",
                meta: {
                    tariffAllowed: true,
                    title: "Справка"
                },
                component: HelpPage
            },
            {
                name: "balances",
                path: "/balances",
                component: BalancesPage,
                meta: {
                    title: "Балансы"
                }
            },
        ];
    }

    /**
     * Обрабатывает  meta-тэги. На данном этапе только меняет title страницы
     * @param to route к которому осуществляется переход
     */
    private static renderMetaTags(to: Route): void {
        const title = (to.meta as RouteMeta).title;
        document.title = title || "Intelinvest";
    }
}

interface RouteMeta {
    tariffAllowed: boolean;
    title?: string;
    public?: boolean;
}