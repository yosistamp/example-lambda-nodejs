# Unit Test

## POST

```
curl -X POST 'http://internal-example-alb-2031510952.ap-northeast-1.elb.amazonaws.com/users' -H 'Content-Type: application/json' -d '{"id": "1", "name": "usagisan", "age": 11}'
```

## GET

```
curl http://internal-example-alb-2031510952.ap-northeast-1.elb.amazonaws.com/users/1
```