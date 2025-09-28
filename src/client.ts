import {Configuration, DefaultApi} from "./generated/src";

export const SearchMCPClient = DefaultApi;

export const createClient = (apiKey: string, basePath = "https://api.searchmcp.io") =>
    new DefaultApi(new Configuration({basePath, headers: {"X-API-Key": apiKey}}));
