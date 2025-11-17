// SQL TABLE STRUCTURE
const farmers=[{id:1,name:"Alemmmmmmmmm",region:"Delta"},
{ id:2,name:"Maya",region:"Central" }];

const farmer_profiles=[{farmer_id:1,phone:"555-1111"},
{ farmer_id:2,phone:"555-2222" }];

const harvests=[{id:1,farmer_id:1,crop:"Tomato",yield_kg:300},
{ id:2,farmer_id:1,crop:"Onion",yield_kg:200 },
{ id:3,farmer_id:2,crop:"Wheat",yield_kg:500 }];

// NOSQL DOCUMENT STRUCTURE

// 1x1 Relationship
const farmerDocs_1x1 = farmers.map(f => {
  const p = farmer_profiles.filter(p => f.id === p.farmer_id);
  return {...f, profile: p};
});

// 1xn Relationship
const farmerDocs_1xn = farmerDocs_1x1.map(f => ({
  ...f,
  harvests: harvests.filter(h => h.farmer_id == f.id)
}));

// Add aggregate value
const withAggregate = farmerDocs_1xn.map(f => ({
  ...f,
  sum_yield : f.harvests.reduce((sum, val) => sum = sum + val.yield_kg, 0)
}));

// Add meta data
let withMetaData = withAggregate.map(f => ({
  raw: f,
  meta: {}
}))

withMetaData = withMetaData.map(f => ({
  ...f,
  meta: {...f.meta, uuid: crypto.randomUUID()}
}))

withMetaData = withMetaData.map(f => ({
  ...f,
  meta: {...f.meta, timestampSync: new Date()}
}))

withMetaData = withMetaData.map(f => ({
  ...f,
  meta: {...f.meta, checksum: JSON.stringify(f.raw).length}
}))

withMetaData = withMetaData.map(f => ({
  ...f,
  meta: {...f.meta, sourceDB: 'MySQL', sourceDBType:'SQL', sourceDBTables: ['farmers','farmer_profiles','harvests']}
}))


console.log(withMetaData));






