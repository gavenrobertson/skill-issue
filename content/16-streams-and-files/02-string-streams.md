---
title: String Streams
summary: Parse text with std::istringstream (words, key=value, CSV), build strings with std::ostringstream, convert between text and numbers, and reuse a stream correctly.
---

## Streams over a string

`<sstream>` gives you three stream classes whose "device" is a `std::string` in memory:

| Class | Use it to | Key members |
| --- | --- | --- |
| `std::istringstream` | **read** from a string (parse) | constructor `(text)`, `>>`, `getline`, `.str(text)` |
| `std::ostringstream` | **write** into a string (build) | `<<`, `.str()` to get the result |
| `std::stringstream` | both | everything above |

Everything you know about `std::cin` and `std::cout` works on them, because they *are* an
`std::istream` and an `std::ostream`.

## `std::istringstream`: parsing

### Splitting on whitespace

The most common use: take one line of text and pull it apart into words or numbers with `>>`, which
skips any amount of spaces, tabs, and newlines.

```cpp run
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

int main() {
    std::string line = "  the quick   brown fox ";
    std::istringstream in(line);            // construct from a string

    std::vector<std::string> words;
    std::string word;
    while (in >> word) {                    // one word per iteration
        words.push_back(word);
    }

    std::cout << words.size() << " words:";
    for (const auto& w : words) std::cout << " [" << w << ']';
    std::cout << '\n';
}
```

```output
4 words: [the] [quick] [brown] [fox]
```

You can mix types. `>>` converts each piece into whatever the target variable is:

```cpp run
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::istringstream in("move 3 2.5 north");
    std::string command, direction;
    int steps;
    double speed;
    in >> command >> steps >> speed >> direction;
    std::cout << command << '|' << steps << '|' << speed << '|' << direction << '\n';
}
```

```output
move|3|2.5|north
```

### The "read a line, then parse it" pattern

Reading with `std::cin >> x` directly can't tell where one line ends and the next begins. When input
is line-structured, read each line with `std::getline` and then parse the line with its own
`std::istringstream`:

```cpp run
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::istringstream input("1 2 3\n10 20\n\n7\n");   // stands in for std::cin

    std::string line;
    int lineNo = 0;
    while (std::getline(input, line)) {
        ++lineNo;
        std::istringstream fields(line);    // a fresh stream per line
        int x;
        int sum = 0;
        while (fields >> x) sum += x;
        std::cout << "line " << lineNo << ": " << sum << '\n';
    }
}
```

```output
line 1: 6
line 2: 30
line 3: 0
line 4: 7
```

### Splitting on a delimiter: `getline(stream, field, ',')`

`std::getline` takes an optional third argument: the **delimiter** character. It reads up to (and
consumes, but doesn't store) that character. This is how you split CSV (comma-separated values):

```cpp run
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::istringstream row("Ada,36,London,,end");
    std::string field;
    int i = 0;
    while (std::getline(row, field, ',')) {
        std::cout << i++ << ": \"" << field << "\"\n";
    }
}
```

```output
0: "Ada"
1: "36"
2: "London"
3: ""
4: "end"
```

Notice the empty field between two commas is preserved (unlike `>>`, which would skip it). One quirk:
a **trailing** comma (`"a,b,"`) does *not* produce a final empty field, because `getline` stops when
there's nothing left to read.

> **Note:** Real-world CSV can contain quoted fields with commas inside (`"Smith, John",42`). Splitting
> on `','` doesn't handle that; use a proper CSV library for messy data. For simple, controlled data
> like the exercises here, `getline` with `','` is perfect.

### Parsing `key=value`

Combine both forms of `getline`: read up to `'='` for the key, then the rest of the line for the value.

```cpp run
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::istringstream config("name=Ada Lovelace\nlevel=7\nbroken line\n");
    std::string line;
    while (std::getline(config, line)) {
        std::istringstream kv(line);
        std::string key, value;
        if (std::getline(kv, key, '=') && std::getline(kv, value)) {
            std::cout << "key '" << key << "' -> value '" << value << "'\n";
        } else {
            std::cout << "skipping: " << line << '\n';
        }
    }
}
```

```output
key 'name' -> value 'Ada Lovelace'
key 'level' -> value '7'
skipping: broken line
```

For `broken line`, the first `getline` reads the whole line as the key (no `'='` found), and then
the second `getline` has nothing left and fails, so the `if` is false. Alternatively, find the `'='`
with `line.find('=')` and use `substr`. Both are fine.

## `std::ostringstream`: building strings

Use `<<` to assemble text, including all the formatting manipulators from `<iomanip>`, then grab the
result with `.str()`:

```cpp run
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

std::string joinPrices(const std::vector<double>& prices) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(2);
    out << '[';
    for (std::size_t i = 0; i < prices.size(); ++i) {
        if (i > 0) out << ", ";
        out << '$' << prices[i];
    }
    out << ']';
    return out.str();               // copy of everything written so far
}

int main() {
    std::string s = joinPrices({3.5, 10, 0.125});
    std::cout << s << " (" << s.size() << " chars)\n";

    std::ostringstream id;
    id << "user-" << std::setw(5) << std::setfill('0') << 42;
    std::cout << id.str() << '\n';
}
```

```output
[$3.50, $10.00, $0.12] (22 chars)
user-00042
```

> **Tip:** In C++20 you can also build strings with `std::format("{:.2f}", x)` (see the I/O module).
> `std::ostringstream` is still the tool of choice when you already have an `operator<<` for your
> type, or when you're writing through a function that takes `std::ostream&`.

## `std::stringstream`: converting both ways

`std::stringstream` can be written to and read from. A classic use is converting between text and
numbers:

```cpp run
#include <iostream>
#include <sstream>
#include <string>

int main() {
    // number -> text
    std::stringstream ss;
    ss << 3.25 << ' ' << 17;
    std::string text = ss.str();
    std::cout << "text: \"" << text << "\"\n";

    // text -> numbers (reading continues from the same stream)
    double d;
    int i;
    ss >> d >> i;
    std::cout << "d + i = " << d + i << '\n';
}
```

```output
text: "3.25 17"
d + i = 20.25
```

For a single value, `std::to_string(n)` and `std::stoi(s)` / `std::stod(s)` are simpler. String
streams shine when there are several values, mixed types, or formatting.

### Did the whole string convert?

`std::stoi("12abc")` happily returns `12`. To insist that the **entire** string is a number, extract
the number and then check that nothing but whitespace remains:

```cpp run
#include <iostream>
#include <sstream>
#include <string>

bool parseInt(const std::string& s, int& out) {
    std::istringstream in(s);
    int value;
    if (!(in >> value)) return false;   // no number at the start
    in >> std::ws;                      // skip trailing whitespace
    if (!in.eof()) return false;        // something else is left over
    out = value;
    return true;
}

int main() {
    for (std::string s : {"42", "  -7  ", "12abc", "abc", ""}) {
        int n = 0;
        if (parseInt(s, n)) std::cout << '"' << s << "\" -> " << n << '\n';
        else std::cout << '"' << s << "\" -> invalid\n";
    }
}
```

```output
"42" -> 42
"  -7  " -> -7
"12abc" -> invalid
"abc" -> invalid
"" -> invalid
```

## Reusing a string stream: `.str("")` **and** `.clear()`

`.str(newText)` replaces the stream's contents. But it does **not** reset the stream's **state**. If an
earlier read hit the end of the string, the stream is in a failed/EOF state, and every later read
fails immediately, even with fresh content. You must also call `.clear()`:

```cpp run
#include <iostream>
#include <sstream>

int main() {
    std::istringstream in("5");
    int x = 0;
    in >> x;                    // reads 5 and hits the end: eof is now set
    std::cout << "first: " << x << '\n';

    in.str("8");                // new content, but the eof flag is still set
    x = -1;
    in >> x;                    // fails immediately, x is untouched
    std::cout << "without clear: " << x << '\n';

    in.clear();                 // reset the state flags
    in.str("9");
    in >> x;
    std::cout << "with clear: " << x << '\n';
}
```

```output
first: 5
without clear: -1
with clear: 9
```

To empty an **output** string stream, use `.str("")` (plus `.clear()` if anything might have failed).
A common mistake is calling `.clear()` alone and expecting the text to disappear: despite its name,
`clear()` only clears the **error flags**, never the contents.

```cpp run
#include <iostream>
#include <sstream>

int main() {
    std::ostringstream out;
    out << "first";
    out.clear();                          // does NOT erase the text!
    std::cout << '[' << out.str() << "]\n";
    out.str("");                          // this erases it
    out << "second";
    std::cout << '[' << out.str() << "]\n";
}
```

```output
[first]
[second]
```

Often the simplest choice is to not reuse at all: declare a **new** stream inside the loop, like the
line-parsing example above. Constructing a string stream is cheap enough for almost every program.

## Pitfall: writing into a stream that already has text

An `std::ostringstream` or `std::stringstream` constructed with initial text starts writing at the
**beginning**, overwriting it. Pass `std::ios::ate` ("at end") to append instead:

```cpp run
#include <iostream>
#include <sstream>

int main() {
    std::ostringstream a("Hello");
    a << "J";
    std::cout << a.str() << '\n';         // overwrote the H

    std::ostringstream b("Hello", std::ios::ate);
    b << ", world";
    std::cout << b.str() << '\n';         // appended
}
```

```output
Jello
Hello, world
```

:::quiz
What does this print?

```cpp
std::istringstream in("a,,b");
std::string f;
int n = 0;
while (std::getline(in, f, ',')) ++n;
std::cout << n;
```

- [ ] `2`
- [x] `3`
- [ ] `4`

`getline` with a delimiter returns `"a"`, then the empty string between the two commas, then `"b"`.
Empty fields are kept.
:::

:::quiz
You reuse one `std::istringstream` for many lines with `in.str(line)`, but after the first line every
read fails. What's missing?

- [ ] `in.flush()`
- [x] `in.clear()`
- [ ] `in.str("")`
- [ ] `in.close()`

The first parse reached the end and set the EOF/fail flags. `.str(...)` replaces the text but keeps
the flags, so you must call `.clear()` too (or just create a new stream for each line).
:::

:::exercise Word stats {easy}
Read **one line** of text. Split it into words using a `std::istringstream` and `>>`, then print:

```
words: <count>
longest: <the longest word>
```

If several words tie for longest, print the **first** one. If the line has no words, print
`longest: (none)`.

```cpp starter
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    // split line into words
}
```

```cpp solution
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::istringstream in(line);
    std::string word;
    std::string longest;
    int count = 0;
    while (in >> word) {
        ++count;
        if (word.size() > longest.size()) {
            longest = word;
        }
    }
    std::cout << "words: " << count << '\n';
    std::cout << "longest: " << (count == 0 ? "(none)" : longest) << '\n';
}
```

```hint
`std::istringstream in(line);` then `while (in >> word)` visits each word.
```

```hint
Use `>` (not `>=`) when comparing lengths so that the first of several equally long words wins.
```

```stdin
the quick brown fox jumps
```

```expected
words: 5
longest: quick
```

```stdin
   a   bb   cc   d
```

```expected hidden
words: 4
longest: bb
```

```stdin
supercalifragilistic is longer than antidisestablishment
second line is ignored entirely
```

```expected hidden
words: 5
longest: supercalifragilistic
```

```stdin

```

```expected
words: 0
longest: (none)
```

```checks
must istringstream|stringstream :: Use a string stream to split the line.
```
:::

:::exercise Key-value config {medium}
Each input line is one of:

- a setting `key=value` (the value is everything after the **first** `=`, and may contain spaces or more `=` signs),
- a comment starting with `#`, or an empty line: ignore these,
- anything else (no `=`): an error.

For each setting print `key -> value`, and for each error line print `bad line: <the line>`. At the
end print `settings: <n>`.

Use `std::getline(stream, key, '=')` on a string stream to split each line.

```cpp starter
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // ...
    }
}
```

```cpp solution
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::string line;
    int settings = 0;
    while (std::getline(std::cin, line)) {
        if (line.empty() || line[0] == '#') {
            continue;
        }
        if (line.find('=') == std::string::npos) {
            std::cout << "bad line: " << line << '\n';
            continue;
        }
        std::istringstream kv(line);
        std::string key;
        std::string value;
        std::getline(kv, key, '=');
        std::getline(kv, value);
        std::cout << key << " -> " << value << '\n';
        ++settings;
    }
    std::cout << "settings: " << settings << '\n';
}
```

```hint
Check for `'='` first with `line.find('=') == std::string::npos`. If there is one,
`std::getline(kv, key, '=')` reads the key and a plain `std::getline(kv, value)` reads the rest.
```

```hint
A line like `x=` has an empty value. `std::getline(kv, value)` then fails and leaves `value` empty,
which is exactly what you want to print.
```

```stdin
# server settings
host=example.com
port=8080

motd=Hello, world
```

```expected
host -> example.com
port -> 8080
motd -> Hello, world
settings: 3
```

```stdin
eq=a=b
oops
empty=
#done
```

```expected hidden
eq -> a=b
bad line: oops
empty ->
settings: 2
```

```stdin
no equals sign
#
url=http://x.y/?a=1&b=2
k=v=w=
```

```expected hidden
bad line: no equals sign
url -> http://x.y/?a=1&b=2
k -> v=w=
settings: 2
```

```expected
settings: 0
```

```checks
must getline\s*\(\s*\w+\s*,\s*\w+\s*,\s*'=' :: Split the key with std::getline(stream, key, '=').
must istringstream|stringstream :: Parse each line with a string stream.
```
:::

:::exercise CSV totals {medium}
The first input line is a header `name,qty,price` (skip it). Every following line is a CSV row with
those three fields, for example `apple,3,0.50`.

For each row print `<name>: <qty * price>` with exactly two decimals, then a final line
`total: <sum of all rows>` with two decimals. With no data rows, the total is `0.00`.

Split each row with `std::getline(row, field, ',')`.

```cpp starter
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);   // header
    // process the rows
}
```

```cpp solution
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::cout << std::fixed << std::setprecision(2);
    double total = 0;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;
        std::istringstream row(line);
        std::string name, qtyText, priceText;
        std::getline(row, name, ',');
        std::getline(row, qtyText, ',');
        std::getline(row, priceText, ',');
        double cost = std::stoi(qtyText) * std::stod(priceText);
        total += cost;
        std::cout << name << ": " << cost << '\n';
    }
    std::cout << "total: " << total << '\n';
}
```

```hint
After splitting, the fields are strings. Convert them with `std::stoi` / `std::stod`, or with
another `std::istringstream`.
```

```hint
`std::cout << std::fixed << std::setprecision(2);` once at the start makes every `double` print with
two decimals.
```

```stdin
name,qty,price
apple,3,0.50
bread,1,2.25
coffee beans,2,7.99
```

```expected
apple: 1.50
bread: 2.25
coffee beans: 15.98
total: 19.73
```

```stdin
name,qty,price
gift card,0,25.00
```

```expected hidden
gift card: 0.00
total: 0.00
```

```stdin
name,qty,price
bolts,1000,0.015

nuts,3,1.10
washer,7,0
```

```expected hidden
bolts: 15.00
nuts: 3.30
washer: 0.00
total: 18.30
```

```stdin
name,qty,price
```

```expected
total: 0.00
```

```checks
must getline\s*\([^;]*',' :: Split fields with std::getline(row, field, ',').
```
:::

:::exercise List builder {easy}
Read an integer `n`, then `n` integers. Build the text `[a, b, c]` (comma and space between items) in
a `std::ostringstream`, then print the built string and its length:

```
[3, 14, 15]
length: 11
```

For `n = 0` the string is `[]` with length 2.

```cpp starter
#include <iostream>
#include <sstream>
#include <string>

int main() {
    int n;
    std::cin >> n;
    // build the text in a std::ostringstream
}
```

```cpp solution
#include <iostream>
#include <sstream>
#include <string>

int main() {
    int n;
    std::cin >> n;
    std::ostringstream out;
    out << '[';
    for (int i = 0; i < n; ++i) {
        int x;
        std::cin >> x;
        if (i > 0) out << ", ";
        out << x;
    }
    out << ']';
    std::string text = out.str();
    std::cout << text << '\n';
    std::cout << "length: " << text.size() << '\n';
}
```

```hint
Write `", "` before every item except the first.
```

```stdin
3
3 14 15
```

```expected
[3, 14, 15]
length: 11
```

```stdin
0
```

```expected
[]
length: 2
```

```stdin
2
-100 0
```

```expected hidden
[-100, 0]
length: 9
```

```stdin
1
-2147483648
```

```expected hidden
[-2147483648]
length: 13
```

```checks
must ostringstream|stringstream :: Build the text in a std::ostringstream.
must \.str\s*\(\s*\) :: Get the result with .str().
```
:::
