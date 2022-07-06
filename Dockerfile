FROM node:14

RUN set -x \
  && git clone https://github.com/DataBiosphere/terra-batch-analysis-ui.git \
  && cd terra-batch-analysis-ui \
  && git checkout ss_submit_workflow \
  && npm install \
  && PUBLIC_URL="https://leonardo.dsde-dev.broadinstitute.org/proxy/google/v1/apps/terra-dev-e64f6eae/terra-app-9d9eba32-0b9e-4981-a9af-a9f18de40db3/cromwell-service" npm run build # to get relative URLs so that it can be load up in proxied environment

FROM us.gcr.io/broad-dsp-gcr-public/base/nginx:stable-alpine
COPY --from=0 /terra-batch-analysis-ui/build /usr/share/nginx/html
