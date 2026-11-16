// Wrangler/esbuild retains function names by injecting __name into nested functions.
// Serialized browser functions need the same helper in their own isolated scope.
export const browserScript=fn=>`(()=>{const __name=(target,value)=>Object.defineProperty(target,'name',{value,configurable:true});(${fn.toString()})();})();`;
