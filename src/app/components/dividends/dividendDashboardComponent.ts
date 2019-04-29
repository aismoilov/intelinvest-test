/*
 * STRICTLY CONFIDENTIAL
 * TRADE SECRET
 * PROPRIETARY:
 *       "Intelinvest" Ltd, TIN 1655386205
 *       420107, REPUBLIC OF TATARSTAN, KAZAN CITY, SPARTAKOVSKAYA STREET, HOUSE 2, ROOM 119
 * (c) "Intelinvest" Ltd, 2019
 *
 * СТРОГО КОНФИДЕНЦИАЛЬНО
 * КОММЕРЧЕСКАЯ ТАЙНА
 * СОБСТВЕННИК:
 *       ООО "Интеллектуальные инвестиции", ИНН 1655386205
 *       420107, РЕСПУБЛИКА ТАТАРСТАН, ГОРОД КАЗАНЬ, УЛИЦА СПАРТАКОВСКАЯ, ДОМ 2, ПОМЕЩЕНИЕ 119
 * (c) ООО "Интеллектуальные инвестиции", 2019
 */

import Component from "vue-class-component";
import {Prop, Watch} from "vue-property-decorator";
import {UI} from "../../app/ui";
import {Filters} from "../../platform/filters/Filters";
import {DividendDashboard} from "../../services/dividendService";
import {DashboardBrick} from "../../types/types";

@Component({
    // language=Vue
    template: `
        <v-card dark class="dashboard-card" :class="{ 'dashboard-border': !block.hasNotBorderLeft }">
            <v-card-title primary-title class="pb-2 dashboard-card-string">
                <div>
                    <span>{{ block.name }}</span>
                    <v-tooltip content-class="custom-tooltip-wrap dashboard-tooltip" :max-width="450" bottom right>
                        <v-icon class="custom-tooltip" slot="activator" small>far fa-question-circle</v-icon>
                        <span v-html="block.tooltip"></span>
                    </v-tooltip>
                </div>
            </v-card-title>
            <v-container fluid pl-3 pt-0>
                <v-layout row class="mx-0 py-2 dashboard-card-big-nums">
                    <span class="dashboard-currency" :class="block.mainCurrency">{{ block.mainValue }} </span>
                </v-layout>
                <v-layout row class="mx-0 dashboard-card-small-nums">
                    <div>
                        <span class="dashboard-currency" :class="block.secondCurrency">{{ block.secondValue }} </span>
                        <span>{{ block.secondValueDesc }}</span>
                    </div>
                </v-layout>
            </v-container>
        </v-card>
    `
})
export class DashboardBrickComponent extends UI {

    @Prop({required: true})
    private block: DashboardBrick;
}

@Component({
    // language=Vue
    template: `
        <v-container v-if="data" px-0 grid-list-md text-xs-center fluid :class="{'fixed-dashboard': fixedDashboard}" v-scroll="setDashboardPosition">
            <v-layout class="dashboard-wrap px-4 selectable" row wrap :class="{'menu-open': !sideBarOpened}">
                <v-flex xl6 lg6 md6 sm12 xs12>
                    <dashboard-brick-component :block="blocks[0]"></dashboard-brick-component>
                </v-flex>
                <v-flex xl6 lg6 md6 sm12 xs12 :align-content-start="true">
                    <dashboard-brick-component :block="blocks[1]"></dashboard-brick-component>
                </v-flex>
            </v-layout>
        </v-container>
    `,
    components: {DashboardBrickComponent}
})
export class DividendDashboardComponent extends UI {

    /** Валюта информации в дашборде */
    @Prop({required: true, type: String})
    private viewCurrency: string;
    /** Признак открытой боковой панели */
    @Prop({required: true, type: Boolean, default: true})
    private sideBarOpened: boolean;
    /** Данные по дашборду */
    @Prop({required: true})
    private data: DividendDashboard;
    /** Блоки для отображения дашборда */
    private blocks: DashboardBrick[] = [];
    /** Признак зафиксированного дашборда */
    private fixedDashboard = false;

    created(): void {
        this.fillBricks(this.data);
    }

    @Watch("data")
    private onBlockChange(newValue: DividendDashboard): void {
        this.fillBricks(newValue);
    }

    private fillBricks(newValue: DividendDashboard): void {
        const mainCurrency = this.viewCurrency.toLowerCase();

        this.blocks[0] = {
            name: "Всего получено дивидендов",
            mainValue: Filters.formatMoneyAmount(newValue.dividendsTotal, true),
            secondValue: Filters.formatMoneyAmount(newValue.dividendsTotalInAlternativeCurrency, true),
            hasNotBorderLeft: true,
            mainCurrency,
            secondCurrency: mainCurrency,
            tooltip: "Общая сумма полученных дивинедов за все время ведения портфеля"
        };
        this.blocks[1] = {
            name: "Дивидендная доходность",
            mainValue: newValue.avgProfit,
            secondValue: newValue.lastYearYield,
            secondValueDesc: "Прибыль за последний год",
            mainCurrency,
            secondCurrency: "percent",
            tooltip: "Дивидендная доходность выраженная в процентах годовых, по отношению " +
                "к текущей стоимости инвестиций."
        };
    }

    private setDashboardPosition(e: any): void {
        const fixed = e.target.scrollingElement.scrollHeight - e.target.scrollingElement.clientHeight > 155 && e.target.scrollingElement.scrollTop > 50;
        if (fixed && !this.fixedDashboard) {
            this.fixedDashboard = true;
        }
        if (e.target.scrollingElement.scrollTop === 0) {
            this.fixedDashboard = false;
        }
    }
}
