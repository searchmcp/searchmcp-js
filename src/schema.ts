import {z} from "zod";

export const Location = {
    UK: "United Kingdom",
    USA: "United States",
    Mexico: "Mexico",
    Japan: "Japan",
    CALIFORNIA_USA: "California, United States",
    SFO_USA: "San Francisco Bay Area, United States",
    NY_USA: "New York, New York, United States",
    MUMBAI_INDIA: "Mumbai, Maharashtra, India",
    LONDON_UK: "London, England, United Kingdom",
    PARIS_FRANCE: "Paris, Paris, Ile-de-France, France",
    DUBAI: "Dubai International Airport, Dubai, United Arab Emirates",
    BANGKOK: "Bangkok, Bangkok, Thailand",
    SOHO_NYC_USA: "SoHo, New York, United States",
} as const;

export type LocationKey = keyof typeof Location;
export type LocationValue = (typeof Location)[LocationKey];

export const DateRange = {
    ANYTIME: "ANYTIME",
    PAST_YEAR: "PAST_YEAR",
    PAST_MONTH: "PAST_MONTH",
    PAST_WEEK: "PAST_WEEK",
    PAST_24_HOURS: "PAST_24_HOURS",
    PAST_HOUR: "PAST_HOUR",
} as const;

export type DateRangeKey = keyof typeof DateRange;

export const CountryCode = {
    AF: "AF", AX: "AX", AL: "AL", DZ: "DZ", AS: "AS", AD: "AD", AO: "AO", AI: "AI", AQ: "AQ",
    AG: "AG", AR: "AR", AM: "AM", AW: "AW", AU: "AU", AT: "AT", AZ: "AZ", BS: "BS", BH: "BH",
    BD: "BD", BB: "BB", BY: "BY", BE: "BE", BZ: "BZ", BJ: "BJ", BM: "BM", BT: "BT", BO: "BO",
    BQ: "BQ", BA: "BA", BW: "BW", BV: "BV", BR: "BR", IO: "IO", BN: "BN", BG: "BG", BF: "BF",
    BI: "BI", KH: "KH", CM: "CM", CA: "CA", CV: "CV", KY: "KY", CF: "CF", TD: "TD", CL: "CL",
    CN: "CN", CX: "CX", CC: "CC", CO: "CO", KM: "KM", CG: "CG", CD: "CD", CK: "CK", CR: "CR",
    CI: "CI", HR: "HR", CU: "CU", CW: "CW", CY: "CY", CZ: "CZ", DK: "DK", DJ: "DJ", DM: "DM",
    DO: "DO", EC: "EC", EG: "EG", SV: "SV", GQ: "GQ", ER: "ER", EE: "EE", SZ: "SZ", ET: "ET",
    FK: "FK", FO: "FO", FJ: "FJ", FI: "FI", FR: "FR", GF: "GF", PF: "PF", TF: "TF", GA: "GA",
    GM: "GM", GE: "GE", DE: "DE", GH: "GH", GI: "GI", GR: "GR", GL: "GL", GD: "GD", GP: "GP",
    GU: "GU", GT: "GT", GG: "GG", GN: "GN", GW: "GW", GY: "GY", HT: "HT", HM: "HM", VA: "VA",
    HN: "HN", HK: "HK", HU: "HU", IS: "IS", IN: "IN", ID: "ID", IR: "IR", IQ: "IQ", IE: "IE",
    IM: "IM", IL: "IL", IT: "IT", JM: "JM", JP: "JP", JE: "JE", JO: "JO", KZ: "KZ", KE: "KE",
    KI: "KI", KP: "KP", KR: "KR", KW: "KW", KG: "KG", LA: "LA", LV: "LV", LB: "LB", LS: "LS",
    LR: "LR", LY: "LY", LI: "LI", LT: "LT", LU: "LU", MO: "MO", MG: "MG", MW: "MW", MY: "MY",
    MV: "MV", ML: "ML", MT: "MT", MH: "MH", MQ: "MQ", MR: "MR", MU: "MU", YT: "YT", MX: "MX",
    FM: "FM", MD: "MD", MC: "MC", MN: "MN", ME: "ME", MS: "MS", MA: "MA", MZ: "MZ", MM: "MM",
    NA: "NA", NR: "NR", NP: "NP", NL: "NL", NC: "NC", NZ: "NZ", NI: "NI", NE: "NE", NG: "NG",
    NU: "NU", NF: "NF", MK: "MK", MP: "MP", NO: "NO", OM: "OM", PK: "PK", PW: "PW", PS: "PS",
    PA: "PA", PG: "PG", PY: "PY", PE: "PE", PH: "PH", PN: "PN", PL: "PL", PT: "PT", PR: "PR",
    QA: "QA", RE: "RE", RO: "RO", RU: "RU", RW: "RW", BL: "BL", SH: "SH", KN: "KN", LC: "LC",
    MF: "MF", PM: "PM", VC: "VC", WS: "WS", SM: "SM", ST: "ST", SA: "SA", SN: "SN", RS: "RS",
    SC: "SC", SL: "SL", SG: "SG", SX: "SX", SK: "SK", SI: "SI", SB: "SB", SO: "SO", ZA: "ZA",
    GS: "GS", SS: "SS", ES: "ES", LK: "LK", SD: "SD", SR: "SR", SJ: "SJ", SE: "SE", CH: "CH",
    SY: "SY", TW: "TW", TJ: "TJ", TZ: "TZ", TH: "TH", TL: "TL", TG: "TG", TK: "TK", TO: "TO",
    TT: "TT", TN: "TN", TR: "TR", TM: "TM", TC: "TC", TV: "TV", UG: "UG", UA: "UA", AE: "AE",
    GB: "GB", US: "US", UM: "UM", UY: "UY", UZ: "UZ", VU: "VU", VE: "VE", VN: "VN", VG: "VG",
    VI: "VI", WF: "WF", EH: "EH", YE: "YE", ZM: "ZM", ZW: "ZW",
} as const;

export type CountryCodeKey = keyof typeof CountryCode;

const LocationSchema = z
    .union([
        z.enum(Object.keys(Location) as [LocationKey, ...LocationKey[]]),
        z.enum(Object.values(Location) as [LocationValue, ...LocationValue[]]),
    ])
    .transform((val) => (val in Location ? Location[val as LocationKey] : val));

export const SearchRequestSchema = z
    .object({
        query: z.string().min(1).max(1024).transform((t) => t.trim()),
        location: LocationSchema.optional(),
        country: z.enum(Object.keys(CountryCode) as [CountryCodeKey, ...CountryCodeKey[]]),
    })
    .partial()
    .extend({
        numberOfResults: z.number().int().min(1).max(100).default(10),
        dateRange: z.enum(Object.keys(DateRange) as [DateRangeKey, ...DateRangeKey[]]).optional(),
    });

export const SearchParametersSchema = z
    .object({
        query: z.string().min(1, "query is required"),
        type: z.string().optional(),
        engine: z.string().optional(),
    })
    .strict();

export const KnowledgeGraphSchema = z
    .object({
        title: z.string().optional(),
        imageUrl: z.string().url().optional(),
        description: z.string().optional(),
        descriptionSource: z.string().optional(),
        descriptionLink: z.string().url().optional(),
        attributes: z.record(z.string(), z.string()).optional(),
    })
    .strict();

export const OrganicItemSchema = z
    .object({
        title: z.string().min(1),
        link: z.string().url(),
        snippet: z.string().optional(),
        position: z.number().int().positive().optional(),
        date: z.string().optional(),
    })
    .strict();

export const RelatedSearchSchema = z
    .object({
        query: z.string().min(1),
    })
    .strict();

export const SearchStatus = {
    UNAUTHORIZED: "UNAUTHORIZED",
    INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
    ERROR: "ERROR",
    SUCCESS: "SUCCESS",
} as const;

export type SearchStatusValue = (typeof SearchStatus)[keyof typeof SearchStatus];

export const SearchResponseSchema = z
    .object({
        status: z.enum(Object.values(SearchStatus) as [SearchStatusValue, ...SearchStatusValue[]]),
        searchParameters: SearchParametersSchema.optional(),
        knowledgeGraph: KnowledgeGraphSchema.optional(),
        organic: z.array(OrganicItemSchema).optional(),
        relatedSearches: z.array(RelatedSearchSchema).optional(),
        credits: z.number().int().nonnegative().optional(),
    })
    .strict();

// Types
export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
