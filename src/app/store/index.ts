import Vue from 'vue';
import Vuex from 'vuex';
import {plainToClass } from "class-transformer";
import { Event } from '../types/Event';
import axios, { AxiosResponse } from 'axios';

Vue.use(Vuex);

const store = new Vuex.Store({
    state: {
        events: Array<Event>(),
        event: null,
    },
    actions: {
        getEvents({ commit }) {
            axios.get('http://localhost:3004/events').then((response: AxiosResponse) => {
                const events = response.data.map((event: Object) => plainToClass(Event, event));
                commit('setEvents', events);
            });
        },
        getEventByIndex({ commit }, index) {
            axios.get('http://localhost:3004/events').then((response: AxiosResponse) => {
                if (response.data[index]) {
                    const event = plainToClass(Event, response.data[index]);
                    commit('setEvent', event);
                } else {
                    commit('setEvent', null);
                }
            });
        }
    },
    mutations: {
        setEvents(state, events: Array<Event>) {
            state.events = events;
        },
        setEvent(state, event: Event) {
            state.event = event;
        }
    },
});

export default store;