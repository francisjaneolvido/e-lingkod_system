// Explicit synthetic compensation/requirements for new or upgraded demo records.
// Does not change the frozen base account/survey fixtures or ordinary database.
export const b5FixtureVersion='elb-b5-fixtures-v1';
export function vacancyDetails(index){
 const basis=['HOUR','DAY','MONTH','YEAR'][index%4];
 const minimum={HOUR:'90.00',DAY:'700.00',MONTH:'18000.00',YEAR:'240000.00'}[basis];
 const maximum={HOUR:'130.00',DAY:'1000.00',MONTH:'27000.00',YEAR:'360000.00'}[basis];
 return {payMin:minimum,payMax:maximum,payCurrency:index%11===0?'USD':'PHP',payBasis:basis,negotiable:index%3===0,occupationCategory:['Administrative','Agriculture','Food & Hospitality','IT'][index%4],employmentSector:['GOVERNMENT','PRIVATE','NONPROFIT'][index%3],workArrangement:['ON_SITE','HYBRID','REMOTE'][index%3],experienceLevel:index%5===0?'EXPERIENCED':'NONE_REQUIRED',certifications:index%7===0?['TESDA NC II']:[],isDemo:true};
}
