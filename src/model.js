export const YEAR = 365.25 * 86400;
export const EPOCH = Date.UTC(2026,0,1);
const rates = {Africa:[31,8],Asia:[16,7],Europe:[9,11],Americas:[15,7],Oceania:[16,7],Polar:[0,0]};
const overrides = {IN:[16.5,7.3],CN:[6.4,8.1],JP:[6.1,12.7],US:[11,9],NG:[36,11],DE:[8.2,12.3],RU:[9,13]};
export function prepare(raw) {return raw.filter(c=>c.population>0 && c.latlng.length===2).map(c=>{const [birth,death]=overrides[c.alpha2Code]||rates[c.region]||[15,8];return {code:c.alpha2Code.toLowerCase(),id:c.numericCode,name:({US:'United States',RU:'Russia',IR:'Iran',VN:'Vietnam',KR:'South Korea',TW:'Taiwan',BO:'Bolivia',VE:'Venezuela',TZ:'Tanzania',GB:'United Kingdom'})[c.alpha2Code]||c.name,region:c.region,lat:c.latlng[0],lon:c.latlng[1],base:Math.round(c.population*1.06),birth,death};});}
export function population(c,seconds){return Math.max(0,Math.floor(c.base*Math.exp((c.birth-c.death)/1000*seconds/YEAR)));}
export function totals(countries,seconds){return countries.reduce((a,c)=>{const p=population(c,seconds);a.population+=p;a.births+=p*c.birth/1000/YEAR;a.deaths+=p*c.death/1000/YEAR;return a;},{population:0,births:0,deaths:0});}
