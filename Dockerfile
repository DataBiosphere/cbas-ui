FROM node:14

RUN set -x \
  && git clone https://github.com/DataBiosphere/terra-batch-analysis-ui.git \
  && cd terra-batch-analysis-ui \
  && git checkout main \
  && npm install \
  && npm run build

FROM us.gcr.io/broad-dsp-gcr-public/base/nginx:stable-alpine
COPY --from=0 /terra-batch-analysis-ui/build /usr/share/nginx/html
