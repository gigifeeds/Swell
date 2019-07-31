import ApolloClient from 'apollo-client';
import { InMemoryCache, ApolloLink } from 'apollo-boost';
import gql from 'graphql-tag';
import { createHttpLink } from 'apollo-link-http';

import * as store from '../store';
import * as actions from '../actions/actions';


const graphQLController = {

  openGraphQLConnection(reqResObj) {

    const client = new ApolloClient({
      link: createHttpLink({ uri: reqResObj.url }),
      headers,
      credentials: 'same-origin',
      cache: new InMemoryCache(),
    });

    // TODO: Refactor to reduce short-circuiting
    if (reqResObj.response.method === 'SUBSCRIPTION') return this.openSubscription(reqResObj, client);

    // initialize response data
    reqResObj.response.headers = {};
    reqResObj.response.events = [];
    reqResObj.connection = 'pending';
    reqResObj.timeSent = Date.now();
    store.default.dispatch(actions.reqResUpdate(reqResObj));

    // TODO: Add request cookies
    const headers = {};
    reqResObj.request.headers.forEach((item) => {
      headers[item.key] = item.value;
    });

    const body = gql`${reqResObj.request.body}`;
    const variables = reqResObj.request.bodyVariables ? JSON.parse(reqResObj.request.bodyVariables) : {};

    if (reqResObj.request.method === 'QUERY') {
      client.query({ query: body, variables })
        // Update the store with the response
        .then(data => this.handleResponse(data, reqResObj))
        .catch((err) => {
          console.error(err);
          reqResObj.connection = 'error';
          store.default.dispatch(actions.reqResUpdate(reqResObj));
        });
    }
    else if (reqResObj.request.method === 'MUTATION') {
      client.mutate({ mutation: body, variables })
        .then(data => this.handleResponse(data, reqResObj))
        .catch((err) => {
          reqResObj.connection = 'error';
          store.default.dispatch(actions.reqResUpdate(reqResObj));
        });
    }
  },

  openSubscription(reqResObj, client) {
    reqResObj.response.headers = {};
    reqResObj.response.events = [];
    reqResObj.connection = 'open';
    reqResObj.connectionType = 'gql-subscription'; // TODO: Do we need this?
    store.default.dispatch(actions.reqResUpdate(reqResObj));
    return;
  },

  handleResponse(response, reqResObj) {
    const reqResCopy = JSON.parse(JSON.stringify(reqResObj));
    // TODO: Add response headers, cookies
    reqResCopy.connection = 'closed';
    reqResCopy.connectionType = 'plain';
    reqResCopy.timeReceived = Date.now();
    reqResCopy.response.events.push(JSON.stringify(response.data));
    store.default.dispatch(actions.reqResUpdate(reqResCopy));
  },
};

export default graphQLController;
