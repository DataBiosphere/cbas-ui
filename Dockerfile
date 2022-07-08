FROM node:14

RUN set -x \
  && git clone https://github.com/DataBiosphere/terra-batch-analysis-ui.git \
  && cd terra-batch-analysis-ui \
  && git checkout ss_submit_workflow \
  && npm install \
  && PUBLIC_URL="https://leonardo.dsde-dev.broadinstitute.org/proxy/google/v1/apps/terra-dev-5b7ecf0f/terra-app-4ed303b7-924f-4802-aa01-33a341087211/cromwell-service/" npm run build # to get relative URLs so that it can be load up in proxied environment

FROM us.gcr.io/broad-dsp-gcr-public/base/nginx:stable-alpine
COPY --from=0 /terra-batch-analysis-ui/build /usr/share/nginx/html
