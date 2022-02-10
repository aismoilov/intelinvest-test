import {Component, UI} from "../app/ui";
import axios from "axios";
import { Event } from "../types/Event";

@Component({
    // language=Vue
    template: `
      <v-container fluid class="content selectable">
      <!-- todo вывести таблицу с событиями, колонки: Дата (date), Сумма (totalAmount), Количество (quantity), Название (label), Комментарий (comment), Период (period) -->
        <div>
          <v-toolbar flat color="white">
            <v-toolbar-title></v-toolbar-title>
            <span class="pr-2 border-r" v-for="(item, key, index) in selectedEventsSum">
              {{ key + ": " + item }}
            </span>
            <v-spacer></v-spacer>
            <v-btn color="primary" dark @click="sumTotalAmount">
              Показать выбранные
            </v-btn>
          </v-toolbar>
          <v-data-table
            v-model="selectedEvents"
            :headers="headers"
            :items="events"
            :pagination.sync="pagination"
            item-key="date"
            class="elevation-1"
          >
            <template v-slot:items="props">
              <tr class="row-pointer" @click="showEvent(props.item)">
                <td>
                  <input type="checkbox" v-on:click.stop="selectItem(props.item)"/>
                </td>
                <td>{{ props.item.date }}</td>
                <td>{{ props.item.totalAmount }}</td>
                <td>{{ props.item.quantity }}</td>
                <td>{{ props.item.label }}</td>
                <td>{{ props.item.comment }}</td>
                <td>{{ props.item.period }}</td>
              </tr>
            </template>
            <template v-slot:expand="props">
              <v-card flat>
                <v-card-text>Peek-a-boo!</v-card-text>
              </v-card>
            </template>
          </v-data-table>
        </div>
      </v-container>
    `
})
export class MainPage extends UI {

  selectedEvents: Array<Event> = [];
  selectedEventsSum: Object = {};
  headers: Array<Object> = [
    { text: '#', sortable: false, value: '' },
    {
      text: 'Дата',
      align: 'left',
      sortable: false,
      value: 'date'
    },
    { text: 'Сумма', sortable: false, value: 'totalAmount' },
    { text: 'Количество', sortable: false, value: 'quantity' },
    { text: 'Название', sortable: false, value: 'label' },
    { text: 'Комментарий', sortable: false, value: 'comment' },
    { text: 'Период', sortable: false, value: 'period' }
  ];
  pagination: Object = {
    descending: true,
    page: 1,
    rowsPerPage: -1
  };

  async created(): Promise<void> {
    this.$store.dispatch('getEvents');
  }

  get events(): Array<Event> {
    return this.$store.state.events;
  }

  selectItem(item: Event): void {
    const checkedIndex = this.selectedEvents.findIndex(event => event === item);
    if (checkedIndex > -1) {
      this.selectedEvents.splice(checkedIndex, 1);
    } else {
      this.selectedEvents.push(item);
    }
  }

  sumTotalAmount() {
    const total: any = {};
    this.selectedEvents.forEach(event => {
        if(total[event.type] !== undefined ) {
          total[event.type] = parseFloat(total[event.type]) + parseFloat(event.price());
        } else {
          total[event.type] = parseFloat(event.price());
        }
    });
    this.selectedEventsSum = total;
  }

  showEvent(item: Event) {
    const index = this.events.findIndex(event => event === item);
    if (index > -1) {
      this.$router.push(`/event/${index}`);
    }
  }


}
