import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),

    // header fix
    (() =>
      ({
        name: 'configure-server',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            //if (req.originalUrl === '/child') {
            res.setHeader(
              'Permissions-Policy',
              //'fullscreen=*'
               'fullscreen=(self "https://bananaacidinterwindowcomm-yhpn--5173--5a421e5b.local-credentialless.webcontainer.io/")'
            );
            //}
            next();
          });
        },
      }),
    )()
  ],
});
