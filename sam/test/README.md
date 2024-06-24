# 動作確認

```
curl -X POST https://cf7q1s2rt4.execute-api.ap-northeast-1.amazonaws.com/user \
     -H "Content-Type: application/json" \
     -d '{"id": 1, "name": "usagisan"}'

curl https://cf7q1s2rt4.execute-api.ap-northeast-1.amazonaws.com/user/1
```
