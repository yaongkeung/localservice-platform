// Wrangler/esbuild retains function names by injecting __name into nested functions.
// Serialized browser functions need the same helper in their own isolated scope.
export const browserScript=(fn,bindings={})=>`(()=>{const __name=(target,value)=>Object.defineProperty(target,'name',{value,configurable:true});${Object.entries(bindings).map(([name,value])=>'const '+name+'='+value.toString()+';').join('')}(${fn.toString()})();})();`;
