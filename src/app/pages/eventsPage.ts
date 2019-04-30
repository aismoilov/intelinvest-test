import dayjs from "dayjs";
import "dayjs/locale/ru";
import {Inject} from "typescript-ioc";
import Component from "vue-class-component";
import {Watch} from "vue-property-decorator";
import {namespace} from "vuex-class/lib/bindings";
import {UI} from "../app/ui";
import {AddTradeDialog} from "../components/dialogs/addTradeDialog";
import {ConfirmDialog} from "../components/dialogs/confirmDialog";
import {ShowProgress} from "../platform/decorators/showProgress";
import {BtnReturn} from "../platform/dialogs/customDialog";
import {DividendNewsItem, EventsAggregateInfo, EventService, ShareEvent} from "../services/eventService";
import {AssetType} from "../types/assetType";
import {Operation} from "../types/operation";
import {Portfolio, TableHeader} from "../types/types";
import {SortUtils} from "../utils/sortUtils";
import {TradeUtils} from "../utils/tradeUtils";
import {MutationType} from "../vuex/mutationType";
import {StoreType} from "../vuex/storeType";

const MainStore = namespace(StoreType.MAIN);

@Component({
    // language=Vue
    template: `
        <v-container v-if="portfolio" fluid class="events">
            <v-card flat class="header-first-card">
                <v-card-title class="header-first-card__wrapper-title">
                    <div class="section-title header-first-card__title-text">События</div>
                    <v-spacer></v-spacer>
                    <v-btn @click.stop="openDialog" class="primary">
                        Добавить событие
                    </v-btn>
                </v-card-title>
            </v-card>

            <v-card class="events__card" flat>
                <v-card-title class="events__card-title">
                    Новые события
                    <v-spacer></v-spacer>
                    <v-menu v-if="events.length" transition="slide-y-transition" bottom left>
                        <v-btn slot="activator" class="events__menu-btn" flat icon dark>
                            <span class="menuDots"></span>
                        </v-btn>
                        <v-list dense style="cursor: pointer;">
                            <v-list-tile @click.native="executeAllEvents">
                                <v-list-tile-title>
                                    Исполнить события с зачислением денег
                                </v-list-tile-title>
                            </v-list-tile>
                            <v-list-tile @click.native="executeAllEventsWithoutMoney"
                                         title="Полезно, если вы хотите быстро учесть все начисления в доходности портфеля, а текущий баланс укажете самостоятельно.">
                                <v-list-tile-title>
                                    Исполнить события без зачисления денег
                                </v-list-tile-title>
                            </v-list-tile>
                            <v-list-tile @click.native="confirmDeleteAllEvents" style="color: #ff5b5d;">
                                <v-list-tile-title>
                                    Удалить все
                                </v-list-tile-title>
                            </v-list-tile>
                        </v-list>
                    </v-menu>
                </v-card-title>

                <v-card-text>
                    <div class="eventsAggregateInfo" v-if="eventsAggregateInfo">
                        <span class="item-block">
                            <span class="item-block__eventLegend dividend"/>
                            <span :class="['item-block__amount', currency]">Дивиденды {{ eventsAggregateInfo.totalDividendsAmount | number }} </span>
                        </span>

                        <span class="item-block">
                            <span class="item-block__eventLegend coupon"/>
                            <span :class="['item-block__amount', currency]">Купоны {{ eventsAggregateInfo.totalCouponsAmount | number }} </span>
                        </span>

                        <span class="item-block">
                            <span class="item-block__eventLegend amortization"/>
                            <span :class="['item-block__amount', currency]">Амортизация {{ eventsAggregateInfo.totalAmortizationsAmount | number }} </span>
                        </span>

                        <span class="item-block">
                            <span class="item-block__eventLegend repayment"/>
                            <span :class="['item-block__amount', currency]">Погашения {{ eventsAggregateInfo.totalRepaymentsAmount | number }} </span>
                        </span>

                        <span class="item-block total">
                            <span :class="['item-block__amount', currency]">Всего выплат {{ eventsAggregateInfo.totalAmount | number }} </span>
                        </span>
                    </div>

                    <v-data-table v-if="events.length" :headers="eventsHeaders" :items="events" item-key="id" :custom-sort="customSortEvents"
                                  class="events-table" hide-actions>
                        <template #items="props">
                            <tr class="selectable">
                                <td class="text-xs-left pl-30">{{ props.item.label }}</td>
                                <td class="text-xs-left">{{ props.item.share.shortname }}</td>
                                <td class="text-xs-left">
                                    <stock-link v-if="props.item.type === 'DIVIDEND'" :ticker="props.item.share.ticker"></stock-link>

                                    <bond-link v-if="props.item.type !== 'DIVIDEND'" :ticker="props.item.share.ticker"></bond-link>
                                </td>
                                <td class="text-xs-right">{{ props.item.date | date }}</td>
                                <td class="text-xs-center">{{ props.item.period }}</td>
                                <td class="text-xs-right ii-number-cell">
                                    {{ props.item.cleanAmount | amount(true) }}
                                    <span class="amount__currency">{{ props.item.cleanAmount | currencySymbol }}</span>
                                </td>
                                <td class="justify-end layout pr-3" @click.stop>
                                    <v-menu transition="slide-y-transition" bottom left>
                                        <v-btn slot="activator" flat icon dark>
                                            <span class="menuDots"></span>
                                        </v-btn>
                                        <v-list dense>
                                            <v-list-tile @click="openTradeDialog(props.item)">
                                                <v-list-tile-title>
                                                    Исполнить
                                                </v-list-tile-title>
                                            </v-list-tile>
                                            <v-list-tile @click="rejectEvent(props.item)">
                                                <v-list-tile-title>
                                                    Удалить
                                                </v-list-tile-title>
                                            </v-list-tile>
                                        </v-list>
                                    </v-menu>
                                </td>
                            </tr>
                        </template>
                    </v-data-table>

                    <div v-else class="events-table__empty">{{ emptyTableText }}</div>
                </v-card-text>
            </v-card>

            <v-card style="margin-top: 30px" flat>
                <v-card-title class="events__card-title">Дивидендные новости</v-card-title>

                <v-card-text>
                    <v-data-table v-if="dividendNews.length" :headers="dividendNewsHeaders" :items="dividendNews" item-key="id" :custom-sort="customSortNews"
                                  class="dividend-news-table events-table" hide-actions>
                        <template #items="props">
                            <tr class="selectable">
                                <td class="text-xs-left pl-30">
                                    <stock-link :ticker="props.item.ticker"></stock-link>
                                </td>
                                <td class="text-xs-left">{{ props.item.shortname }}</td>
                                <td class="text-xs-right">{{ props.item.meetDate }}</td>
                                <td class="text-xs-right">{{ props.item.cutDate }}</td>
                                <td class="text-xs-right ii-number-cell">
                                    {{ props.item.recCommonValue | number }}
                                    <span class="amount__currency">{{ props.item.currency | currencySymbolByCurrency }}</span>
                                </td>
                                <td class="text-xs-center pr-3">{{ props.item.source }}</td>
                            </tr>
                        </template>
                    </v-data-table>

                    <div v-else class="dividend-news-table__empty">Дивидендных новостей по вашим бумагам нет</div>
                </v-card-text>
            </v-card>
            <v-card class="events__card" flat style="margin-top: 30px">
                <v-card-title class="events__card-title">
                    <v-layout class="px-0 py-0">
                        Календарь событий
                        <v-spacer></v-spacer>
                        <div class="import-wrapper-content pr-1">
                            <v-menu content-class="dialog-setings-menu"
                                    transition="slide-y-transition"
                                    nudge-bottom="36" left bottom class="setings-menu my-0 mx-0"
                                    :close-on-content-click="false" min-width="255">
                                <v-btn class="btn" slot="activator">
                                    Настройки
                                </v-btn>
                                <v-list dense>
                                    <div class="title-setings">
                                        Тип события
                                    </div>
                                    <v-flex>
                                        <v-checkbox v-for="item in calendarEventsTypes" :input-value="getFilterParams(item)" @change="changeFilterParams(item)"
                                                    :key="item" hide-details class="checkbox-setings">
                                            <template #label>
                                                <span>
                                                    {{ getTypeEvent(item) }}
                                                </span>
                                            </template>
                                        </v-checkbox>
                                    </v-flex>
                                </v-list>
                            </v-menu>
                        </div>
                    </v-layout>
                </v-card-title>
                <v-card-text class="events-calendar-wrap">
                    <v-layout class="pl-3">
                        <div class="pl-3">
                            <v-menu
                                v-model="miniCalendarMenu"
                                :close-on-content-click="false"
                                full-width
                                bottom right
                                nudge-bottom="23"
                                nudge-right="6"
                                max-width="290"
                            >
                                <template v-slot:activator="{ on }">
                                    <v-flex :class="['select-date-input', miniCalendarMenu ? 'rotate-icons' : '']">
                                        <v-input
                                            append-icon="keyboard_arrow_down"
                                            v-on="on"
                                            hide-details
                                        >
                                            {{ formattedDate }}
                                        </v-input>
                                    </v-flex>
                                </template>
                                <v-date-picker
                                    v-model="calendarStartDate"
                                    type="month"
                                    locale="ru"
                                    @change="changeMonth()"
                                ></v-date-picker>
                            </v-menu>
                        </div>
                    </v-layout>
                    <v-sheet v-if="calendarEvents">
                        <v-calendar :now="today" color="primary" locale="ru">
                            <template v-slot:day="{ date }">
                                <vue-scroll>
                                    <div class="wrap-list-events">
                                        <div>
                                            <div v-for="event in calendarEvents[date]" :key="event.title">
                                                <v-menu max-width="267" right nudge-right="150" content-class="fs13 info-about-event">
                                                    <template v-slot:activator="{ on }">
                                                        <div v-ripple v-on="on" :class="[event.styleClass, 'fs13', 'calendar-events-title', 'pl-2']">
                                                            {{ getTypeEvent(event.styleClass) }}
                                                        </div>
                                                    </template>
                                                    <v-card flat>
                                                        {{ event.description }}
                                                    </v-card>
                                                </v-menu>
                                            </div>
                                        </div>
                                    </div>
                                </vue-scroll>
                            </template>
                        </v-calendar>
                    </v-sheet>
                </v-card-text>
            </v-card>
        </v-container>
    `
})
export class EventsPage extends UI {

    @MainStore.Getter
    private portfolio: Portfolio;
    @MainStore.Action(MutationType.RELOAD_PORTFOLIO)
    private reloadPortfolio: (id: number) => Promise<void>;
    @Inject
    private eventService: EventService;
    /** События */
    private events: ShareEvent[] = [];
    private eventsAggregateInfo: EventsAggregateInfo = null;
    /** Дивидендные новости */
    private dividendNews: DividendNewsItem[] = [];
    /** Зголовки таблицы События */
    private eventsHeaders: TableHeader[] = [
        {text: "Событие", align: "left", value: "label", width: "150"},
        {text: "Компания", align: "left", value: "shortname", width: "120"},
        {text: "Тикер", align: "left", value: "ticker", width: "100"},
        {text: "Дата выплаты/Закрытия реестра", align: "right", value: "date", width: "50"},
        {text: "Период", align: "center", value: "period", sortable: false, width: "180"},
        {text: "Начислено", align: "right", value: "cleanAmount", width: "150"},
        {text: "", value: "actions", align: "center", width: "25", sortable: false}
    ];
    /** Зголовки таблицы Дивидендные новости */
    private dividendNewsHeaders: TableHeader[] = [
        {text: "Тикер", align: "left", value: "ticker", width: "50"},
        {text: "Компания", align: "left", value: "shortname"},
        {text: "Дата собрания акционеров", align: "right", value: "meetDate", width: "70"},
        {text: "Закрытие реестра", align: "right", value: "cutDate", width: "70"},
        {text: "Размер возможных дивидендов", align: "right", value: "recCommonValue", width: "60"},
        {text: "Источник", align: "center", value: "source", sortable: false, width: "70"}
    ];
    /** Параметры дат для отправки в апи */
    private calendarParams: any = {
        start: "",
        end: ""
    };
    /** Устанавливаем сегодняшнюю дату */
    private today: string = new Date().toISOString().substr(0, 10);
    /** При загрузке отображать в календаре текущий месяц */
    private calendarStartDate: string = new Date().toISOString().substr(0, 10);
    /** Массив с ивентами для отображения на странице */
    private calendarEvents: any[] = [];
    /** Конфиг отображения мини календаря для пика месяца */
    private miniCalendarMenu: boolean = false;
    /** Типы ивентов которые отображаються на странице */
    private typeCalendarEvents: string[] = this.eventService.calendarEvents;
    /** Типы ивентов для использования в шаблоне */
    private calendarEventsTypes = CalendarEventsTypes;
    /**
     * Инициализация данных
     * @inheritDoc
     */
    @ShowProgress
    async created(): Promise<void> {
        await this.loadEvents();
        await this.loadDividendNews();
        this.getMonthDay(dayjs(this.calendarStartDate).year(), dayjs(this.calendarStartDate).month());
    }

    @Watch("portfolio")
    @ShowProgress
    private async onPortfolioChange(): Promise<void> {
        await this.loadEvents();
        await this.loadDividendNews();
    }

    /** Получаем уже отфильтрованные данные для календаря */
    @ShowProgress
    private async getCalendarEvents(): Promise<void> {
        this.calendarEvents = await this.eventService.getCalendarEvents(this.calendarParams, this.typeCalendarEvents);
    }

    /** Устанавливаем чекбоксы в состояние согласно фильтру */
    private getFilterParams(typeEvents: CalendarEventsTypes): boolean {
        return this.typeCalendarEvents.includes(typeEvents);
    }

    /** Форматирование даты для отображения на странице согласно макету */
    private get formattedDate(): string {
        return dayjs(this.calendarStartDate).locale("ru").format("MMMM YYYY");
    }

    /** Получаем тип ивентов на рус. языке */
    private getTypeEvent(typeEvents: CalendarEventsTypes): string {
        switch (typeEvents) {
            case CalendarEventsTypes.COUPON:
                return "Купон";
            case CalendarEventsTypes.AMORTIZATION:
                return "Амортизация";
            case CalendarEventsTypes.DIVIDEND:
                return "Дивиденды";
            case CalendarEventsTypes.REPAYMENT:
                return "Погашение";
            case CalendarEventsTypes.CUSTOM:
                return "Пользоватeль";
        }
    }

    /** Изменение параметров фильтрации */
    private async changeFilterParams(typeEvents: CalendarEventsTypes): Promise<void> {
        let i: number = null;
        this.typeCalendarEvents.forEach((currentValue, index) => {
            if (currentValue === typeEvents) {
                i = index;
            }
        });
        if (i || i === 0) {
            this.typeCalendarEvents.splice(i, 1);
        } else {
            this.typeCalendarEvents.push(typeEvents);
        }
        await this.eventService.setCaneldarEvents(this.typeCalendarEvents);
        this.getCalendarEvents();
    }

    /** Получаем дату начала месяца и дату конца месяца для отправки в апи */
    private getMonthDay(year: number, month: number): void {
        this.calendarParams.start = dayjs(`${year}` + "-" + `${month + 1}` + "-" + "01").format("YYYY-MM-DD");
        this.calendarParams.end = dayjs(`${year}` + "-" + `${month + 1}` + "-" + `${new Date(year, month + 1, 0).getDate()}`).format("YYYY-MM-DD");
        this.getCalendarEvents();
    }

    /** Изменение месяца отображаемого в календаре */
    private changeMonth(): void {
        this.getMonthDay(dayjs(this.calendarStartDate).year(), dayjs(this.calendarStartDate).month());
        this.miniCalendarMenu = false;
    }

    private async loadEvents(): Promise<void> {
        const eventsResponse = await this.eventService.getEvents(this.portfolio.id);
        this.events = eventsResponse.events;
        this.eventsAggregateInfo = eventsResponse.eventsAggregateInfo;
    }

    private async loadDividendNews(): Promise<void> {
        this.dividendNews = await this.eventService.getDividendNews(this.portfolio.id);
    }

    private async openTradeDialog(event: ShareEvent): Promise<void> {
        const operation = Operation.valueByName(event.type);
        const result = await new AddTradeDialog().show({
            store: this.$store.state[StoreType.MAIN],
            router: this.$router,
            share: event.share,
            eventFields: {
                amount: event.cleanAmountPerShare || event.amountPerShare,
                quantity: event.quantity,
                eventPeriod: event.period,
                eventDate: event.date,
                note: TradeUtils.eventNote(event),
                perOne: true,
            },
            operation,
            assetType: operation === Operation.DIVIDEND ? AssetType.STOCK : AssetType.BOND
        });
        if (result) {
            // только перезагружаем портфель, вотчер перезагрузит события и дивиденды
            await this.reloadPortfolio(this.portfolio.id);
        }
    }

    private async openDialog(): Promise<void> {
        const result = await new AddTradeDialog().show({store: this.$store.state[StoreType.MAIN], router: this.$router});
        if (result) {
            await this.reloadPortfolio(this.portfolio.id);
        }
    }

    private async confirmDeleteAllEvents(): Promise<void> {
        const result = await new ConfirmDialog().show("Вы уверены что хотите удалить все начисления?");
        if (result === BtnReturn.YES) {
            await this.deleteAllEvents();
        }
    }

    @ShowProgress
    private async deleteAllEvents(): Promise<void> {
        await this.eventService.deleteAllEvents(this.portfolio.id);
        await this.loadEvents();
        this.$snotify.info("Начисления успешно удалены");
    }

    @ShowProgress
    private async executeAllEventsWithoutMoney(): Promise<void> {
        await this.eventService.executeAllEvents(this.portfolio.id, false);
        await this.reloadPortfolio(this.portfolio.id);
        this.$snotify.info("Начисления успешно исполнены");
    }

    @ShowProgress
    private async executeAllEvents(): Promise<void> {
        await this.eventService.executeAllEvents(this.portfolio.id, true);
        await this.reloadPortfolio(this.portfolio.id);
        this.$snotify.info("Начисления успешно исполнены");
    }

    @ShowProgress
    private async rejectEvent(event: ShareEvent): Promise<void> {
        await this.eventService.rejectEvent({
            date: event.date,
            totalAmount: event.totalAmount,
            period: event.period,
            portfolioId: event.portfolioId,
            quantity: event.quantity,
            shareId: event.share.id,
            type: event.type
        });
        await this.loadEvents();
        this.$snotify.info("Начисление удалено");
    }

    private get emptyTableText(): string {
        return this.portfolio.overview.totalTradesCount !== 0 ? "Новых событий по вашим бумагам еще не появилось" :
            "Добавьте свою первую сделку чтобы мы могли предложить вам события";
    }

    private customSortEvents(items: ShareEvent[], index: string, isDesc: boolean): ShareEvent[] {
        return SortUtils.customSortEvents(items, index, isDesc);
    }

    private customSortNews(items: DividendNewsItem[], index: string, isDesc: boolean): DividendNewsItem[] {
        return SortUtils.customSortNews(items, index, isDesc);
    }

    private get currency(): string {
        return this.portfolio.portfolioParams.viewCurrency.toLowerCase();
    }
}
export enum CalendarEventsTypes {
    COUPON = "coupon",
    AMORTIZATION = "amortization",
    DIVIDEND = "dividend",
    REPAYMENT = "repayment",
    CUSTOM = "custom"
}