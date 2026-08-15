# Chain Reaction Mania

# CHAIN BURST MVP v1

「CHAIN BURST」という、ブラウザで短時間に遊べるシンプルな連鎖型ゲームを作ってください。

プレイヤーは画面内を動いているボールを見ながら、1プレイにつき1回だけ好きな場所をクリックまたはタップします。

その場所から爆発が広がり、爆発に触れたボールがさらに爆発します。

その爆発が別のボールに触れることで連鎖していき、できるだけ多くのボールを巻き込むことを目指します。

## 画面

2画面構成にしてください。

### タイトル画面

表示するもの：

- ゲームタイトル「CHAIN BURST」

- 短いゲーム説明

- 簡単な遊び方

- START

- BEST CHAIN

- PLAY COUNT

STARTからゲーム画面へ移動します。

### ゲーム画面

表示するもの：

- 現在のCHAIN

- BEST CHAIN

- ゲームフィールド

- RESULT

- RETRY

- TITLEへ戻る操作

ゲーム開始直後は、ユーザーがクリックまたはタップできることが分かるように、

「CLICK / TAP ANYWHERE」

などの表示をしてください。

## ゲームルール

ゲーム開始時に30個程度のボールがゲームフィールド内をランダムに動いています。

ボールは画面端で跳ね返ります。

プレイヤーが操作できるのは1回だけです。

クリックまたはタップした地点から円形の爆発が広がります。

爆発に触れたボールは爆発します。

爆発したボールからも新しい爆発が広がり、別のボールに触れることでさらに連鎖します。

同じボールは1回しかCHAINとして数えません。

連鎖中はCHAIN数がリアルタイムに増えるようにしてください。

すべての連鎖が終了したらRESULTを表示してください。

## RESULT

例えば、

「CHAIN 18 / 30」

のように結果を分かりやすく表示してください。

過去最高を更新した場合は「NEW BEST!」などで分かるようにしてください。

RESULTから、

- RETRY

- TITLEへ戻る

を選択できます。

RETRYは待ち時間を感じさせず、すぐ再プレイできるようにしてください。

## 保存

以下をブラウザ内に保存してください。

- BEST CHAIN

- PLAY COUNT

ブラウザを再読み込みしても残ること。

ログインやサーバーへのデータ保存は不要です。

## 対応端末

以下で遊べるようにしてください。

- PC

- タブレット

- スマートフォン

PCではクリック、タブレット・スマートフォンではタップで遊べること。

画面サイズが変わっても重大なレイアウト崩れが起きないようにしてください。

## UX

初めてゲームを見た人でも、

タイトル

→ START

→ 1回操作

→ 連鎖を見る

→ RESULT

→ RETRY

という流れを迷わず進められることを重視してください。

今回のゲームでは、操作後に連鎖が広がっていく様子を見ること自体がゲーム体験です。

結果だけを瞬時に表示するのではなく、どのように連鎖していくのか視覚的に楽しめるようにしてください。

## デザイン

ゲームとして最低限完成した見た目にしてください。

以下を満たしてください。

- タイトル画面とゲーム画面が明確に分かる

- STARTが目立つ

- CHAINとBESTが読みやすい

- ボールと爆発を背景から識別できる

- RESULTが分かりやすい

- RETRYとTITLEを間違えにくい

- 未完成のデフォルト画面に見えない

色、フォント、ボールの表現、爆発表現などの具体的なビジュアルデザインは任せます。

## MVP v1完成条件

以下をすべて満たした時点をMVP v1完成とします。

1. タイトル画面からゲームを開始できる

2. 複数のボールが動く

3. ボールが画面端で反射する

4. 操作は1プレイ1回だけ

5. 操作地点から爆発が発生する

6. ボールへ爆発が連鎖する

7. 同じボールを二重にカウントしない

8. CHAIN数がリアルタイムに表示される

9. 連鎖の進行が視覚的に分かる

10. 連鎖終了後にRESULTが表示される

11. RETRYですぐ再プレイできる

12. タイトル画面へ戻れる

13. BEST CHAINが保存される

14. PLAY COUNTが保存される

15. 再読み込みしても保存値が残る

16. PC・タブレット・スマートフォンで操作できる

17. 通常操作でゲーム進行不能になる重大な不具合がない

18. ゲームとして最低限完成した見た目になっている

## 今回は不要なもの

以下はMVP v1には不要です。

- ログイン

- オンラインランキング

- データベース

- 複数ステージ

- 難易度選択

- マルチプレイ

- 課金

- 広告

- AI機能

- 豪華な効果音や演出

まずMVP v1を完成させることを優先してください。

内部の技術構成や実装方法については、この要件を満たすために適切な方法を選択してください。

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/277cace2-781e-4ec5-b132-dd9cc2240eb6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
