/**
 * Реестр стандартных UI-компонтентов, фильтров и директив
 */
import dayjs from "dayjs";
import "dayjs/locale/ru";
import Vue from "vue";
import Vuetify from 'vuetify';

export class UIRegistry {

    /**
     * Инициализация реестра компонентов, фильтров и директив
     */
    static init(): void {
        Vue.use(Vuetify, {
            lang: {
                current: "ru"
            }
        });
        dayjs.locale("ru");
    }
}
