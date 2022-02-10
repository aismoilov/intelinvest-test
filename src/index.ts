import Vue from "vue";
import {AppFrame} from "./app/app/appFrame";
import {UI} from "./app/app/ui";
import {UIRegistry} from "./app/app/uiRegistry";
import {RouterConfiguration} from "./app/router/routerConfiguration";
import store from './app/store/index';

/**
 * Запуск приложения
 */
export async function start(): Promise<void> {
    try {
        const errorHandler = (error: Error | string): void => {
            UI.emit("HANDLE_ERROR", error);
            // логгируем ошибки только в prod-сборке
            if (!Vue.config.productionTip) {
                // не логгируем в сентри пользовательские ошибки, например, о том что имя пользователя уже занято ошибка сети
            }
        };
        // Устанавливаем обработчик ошибок по умолчанию
        configureErrorHandling(errorHandler);
        // инициализируем компоненты
        UIRegistry.init();
        /** Запуск приложения */
        const router = RouterConfiguration.getRouter();
        // Обработчик _синхронных_ ошибок в lifecycle-хуках роутера
        router.onError(errorHandler);
        const app = new AppFrame({router, store});
        app.$mount("#app");
    } catch (error) {
        console.error("ERROR WHILE INIT APPLICATION", error);
    }
}

/**
 * Конфигурирование глобальных обработчиков ошибок
 */
function configureErrorHandling(errorHandler: (error: Error | string) => void): void {
    // Обработчик ошибок (_синхронных_ и _асинхронных_) в lifecycle-хуках компонентов и обработчиках событий (+ обработка _синхронных_ ошибок в watcher'ах)
    Vue.config.errorHandler = errorHandler;
    // Обработчик прочих _асинхронных_ исключений (например в lifecycle-хуках роутера и в watcher'ах)
    (window as any).onunhandledrejection = (event: any): void => errorHandler(event.reason.message);
}

start();
