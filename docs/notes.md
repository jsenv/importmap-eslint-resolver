Import maps are used to remap import to somewhere else. For instance the following importmap allows to remap `"foo"` to `"./foo.js"`.

```json
{
  "imports": {
    "foo": "./foo.js"
  }
}
```

By providing this importmap to the browser or Node.js, js imports resolution becomes aware of the importmap file remappings. You can write the following js file and it would search for file at `"./foo.js"`.

```js
import { value } from "foo"

console.log(value)
```
