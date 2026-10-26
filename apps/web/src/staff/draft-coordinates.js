export const emptyDraft={nameEN:'',sourceTextEN:'',location:{type:'Point',coordinates:[null,null]},entrance:null,thumbnailAsset:null};
export const validDraftPoint=value=>value?.type==='Point'&&Array.isArray(value.coordinates)&&value.coordinates.length===2&&value.coordinates.every(Number.isFinite)&&Math.abs(value.coordinates[0])<=180&&Math.abs(value.coordinates[1])<=90;
export const validDraftCoordinates=input=>validDraftPoint(input.location)&&(input.entrance===null||validDraftPoint(input.entrance));
export function editCoordinate(value,index,text,{nullable=false}={}){
  const coordinates=[...(value?.coordinates??[null,null])];coordinates[index]=text===''?null:Number(text);
  return nullable&&coordinates.every(c=>c===null)?null:{type:'Point',coordinates};
}
