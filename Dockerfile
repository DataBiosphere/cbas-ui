FROM node:14

RUN set -x \
  && git clone https://github.com/DataBiosphere/cbas-ui.git \
  && cd cbas-ui \
  && git checkout workflow_logs \
  && npm install \
  && PUBLIC_URL="." npm run build # to get relative URLs so that it can be load up in proxied environment

FROM us.gcr.io/broad-dsp-gcr-public/base/nginx:stable-alpine
COPY --from=0 /cbas-ui/build /usr/share/nginx/html
