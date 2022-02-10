import {Component, UI} from "../app/ui";
import axios from "axios";
import { Event } from "../types/Event";

@Component({
    // language=Vue
    template: `
        <v-container fluid class="content selectable">
          <v-layout>
            <v-flex xs12 sm6 offset-sm3>
              <v-card>
                <v-card-title v-if="event">
                  <div class="ma-0">
                    <span class="grey--text">{{ event.date }}</span><br>
                    <span class="headline">{{ event.label }}</span><br>
                    <span v-if="event.comment">Комментарий: {{ event.comment }}</span>
                    <v-divider class="my-2"></v-divider>
                    <div class="d-flex justify-space-between">
                      <span>Cумма: {{ event.totalAmount }}</span>
                      <span v-if="event.period">Период: {{ event.period }}</span>
                    </div>
                  </div>
                </v-card-title>
                <v-card-title v-else>
                  <span>Событие не найдено.</span>
                </v-card-title>
                <v-card-actions>
                  <router-link class="ml-2" to="/" flat color="orange">< К списку событий</router-link>
                </v-card-actions>
              </v-card>
            </v-flex>
          </v-layout>
        </v-container>
    `
})

export class EventPage extends UI {

  async created(): Promise<void> {
    const index = this.$route.params.index || null;
    this.$store.dispatch('getEventByIndex', index);
  }

  get event(): any {
    return this.$store.state.event;
  }
}
