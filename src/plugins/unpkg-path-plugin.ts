import * as esbuild from 'esbuild-wasm';
import axios from "axios"
import localForage from "localforage"

const fileCache = localForage.createInstance({
    name: 'filecache'
});

(async()=>{
    await fileCache.setItem("color","red")
    const color = await fileCache.getItem("color")

    console.log(color)
})()

export const unpkgPathPlugin = (inputCode: string) => {
    return {
        name: 'unpkg-path-plugin',
        setup(build: esbuild.PluginBuild) {
            build.onResolve({ filter: /.*/ }, async (args: any) => {
                console.log('onResole', args);
                if(args.path ==="index.js"){
                    return {path: args.path, namespace:"a"}
                }

                if (args.path.includes("./") || args.path.includes("../")){
                    return {
                        namespace:"a",
                        path: new URL(args.path, "https://unpkg.com"+ args.resolveDir+ "/").href
                    }
                } 
                
                /* else if (args.path ==='tiny-test-pkg'){
                    return {
                        path: "https://unpkg.com/tiny-test-pkg@1.0.0/index.js",
                        namespace:"a"
                    }
                } */
                return { path: `https://unpkg.com/${args.path}`, namespace: 'a' };
            });

            build.onLoad({ filter: /.*/ }, async (args: any) => {
                console.log('onLoad', args);

                if (args.path === 'index.js') {
                    return {
                        loader: 'jsx',
                        contents: inputCode,
                    };
                }

                // Check to see if we have already fetched this file 
                const cachedResult = await fileCache.getItem <esbuild.OnLoadResult>(args.path)

                // if it is return it immediately
                if(cachedResult){return cachedResult}

                const {data, request} = await axios.get(args.path)
                
                const result : esbuild.OnLoadResult = {
                    loader: "jsx",
                    contents: data,
                    resolveDir: new URL("./", request.responseURL).pathname
                } 
                // store response cached
                await fileCache.setItem(args.path, result)
                return result
            });
        },
    };
};
