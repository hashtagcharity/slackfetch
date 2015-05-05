FROM node:0.10-wheezy

ENV PORT 3000
# has to be stated explicitly
EXPOSE 3000

ADD . /slackfetch

# RUN apt-get update -y
RUN cd /slackfetch && npm install

WORKDIR /slackfetch

CMD ["node", "index.js"]
