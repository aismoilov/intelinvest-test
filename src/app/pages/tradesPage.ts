import {Inject} from "typescript-ioc";
import Component from "vue-class-component";
import {Watch} from "vue-property-decorator";
import {namespace} from "vuex-class/lib/bindings";
import {UI} from "../app/ui";
import {TradesTable} from "../components/tradesTable";
import {TradeService} from "../services/tradeService";
import {Pagination, Portfolio, TablePagination, TradeRow} from "../types/types";
import {StoreType} from "../vuex/storeType";

const MainStore = namespace(StoreType.MAIN);

@Component({
    // language=Vue
    template: `
        <v-container v-if="portfolio" fluid>
            <dashboard :data="portfolio.overview.dashboardData"></dashboard>
            <trades-table :trades="trades" :trade-pagination="tradePagination"></trades-table>
            <v-container v-if="pages > 1">
                <v-layout align-center justify-center row>
                    <v-pagination v-model="page" :length="pages"></v-pagination>
                </v-layout>
            </v-container>
        </v-container>
    `,
    components: {TradesTable}
})
export class TradesPage extends UI {

    @MainStore.Getter
    private portfolio: Portfolio;

    @Inject
    private tradeService: TradeService;

    private page = 1;

    private loading = false;

    private totalTrades = 0;

    private pageSize = 50;

    private pages = 0;

    private pagination: Pagination = {
        descending: false,
        page: this.page,
        rowsPerPage: this.pageSize,
        sortBy: "ticker",
        totalItems: this.totalTrades
    };

    private tradePagination: TablePagination = {
        pagination: this.pagination,
        totalItems: this.totalTrades,
        loading: this.loading
    };

    private trades: TradeRow[] = [];

    async created(): Promise<void> {
        await this.loadTrades();
        this.calculatePagination();
    }

    @Watch("page")
    private async onPageChange(): Promise<void> {
        await this.loadTrades();
    }

    @Watch("portfolio")
    private async onPortfolioChange(): Promise<void> {
        await this.loadTrades();
        this.calculatePagination();
    }

    @Watch("tradePagination.pagination", {deep: true})
    private async onTradePaginationChange(): Promise<void> {
        await this.loadTrades();
    }

    private calculatePagination(): void {
        this.totalTrades = this.portfolio.overview.totalTradesCount;
        this.pages = parseInt(String(this.totalTrades / this.pageSize), 10);
    }

    private async loadTrades(): Promise<void> {
        this.tradePagination.loading = true;
        this.trades = await this.tradeService.loadTrades(this.portfolio.id, this.pageSize * (this.page - 1),
            this.pageSize, this.tradePagination.pagination.sortBy, this.tradePagination.pagination.descending);
        this.tradePagination.loading = false;
    }
}