# 生成AIプロンプト

## モデル

claude 3.5 sonnet

## 初期

- 次の条件を満たすサンプルとなるCRUDアプリを作成してください
  - 開発言語はJavascriptです
  - Lambdaはnode.js v20を利用します
  - エンドポイントは/userです
  - userのスキーマはidとnameだけになります
  - バリデート処理は以下の通りです
    - idは数値のみ許可
    - nameは文字列で20文字以内
    - バリデートにはaws-power-toolsを用いてください
  - ログ出力はリクエスト内容をINFOで出力してください
    - 出力形式はJSON
    - 出力にはaws-power-toolsを用いてください
- AWS Lambdaにデプロイします
- デプロイにはAWS SAM を利用します
- APIGatewayもAWS SAMでデプロイしてください
- 開発環境のプロジェクト生成から、AWS上にデプロイするまでの一通りの手順も作成してください

## validateの削除

 @aws-lambda-powertools/validator は存在しないので削除指示

 ## RESTからHTTP

 APIGatewayがRESTモードになっていたのでHTTPモードに変更指示

 