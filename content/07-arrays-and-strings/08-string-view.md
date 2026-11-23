---
title: std::string_view
summary: A cheap, read-only window onto text owned by someone else. Why it exists, how to use it as a parameter, slicing without copying, and the dangling-view trap.
---

## The problem it solves

Say you write a function that only **reads** some text. With what you know so far, the natural
signature is `void print(const std::string& s)`. That works, but look what happens with different
callers:

```cpp
print(name);                 // a std::string: no copy, great
print("hello there");        // a literal: a temporary std::string is CREATED (may allocate memory)
print(line.substr(0, 5));    // substr builds a NEW string, then we pass it
```

Converting literals and building substrings means allocating and copying characters, just to look at
them. And a `const char*` parameter would accept literals cheaply but not `std::string` substrings.

**`std::string_view`** (from `<string_view>`, C++17) is the answer: a tiny object holding just a
**pointer to the first character and a length**. It *views* characters that live somewhere else:
in a `std::string`, a literal, or a char array. Creating one never copies the text.

```cpp run
#include <iostream>
#include <string>
#include <string_view>

void print(std::string_view text) {          // by value: it's just a pointer and a size
    std::cout << '[' << text << "] (" << text.size() << ")\n";
}

int main() {
    std::string name = "Grace Hopper";
    char letters[] = "abc";

    print(name);              // views name's characters
    print("a literal");       // views the literal directly, no std::string created
    print(letters);           // views the char array
}
```

```output
[Grace Hopper] (12)
[a literal] (9)
[abc] (3)
```

Copying a `string_view` copies two small values, so pass it **by value**, not by `const&`.

## Creating views

```cpp run
#include <iostream>
#include <string>
#include <string_view>

using namespace std::string_view_literals;   // enables the "..."sv suffix

int main() {
    std::string_view a = "hello";            // from a literal
    std::string s = "world wide web";
    std::string_view b = s;                  // from a std::string
    std::string_view c(s.data() + 6, 4);     // from a pointer and a length: "wide"
    auto d = "literal"sv;                    // the sv suffix makes a std::string_view
    std::string_view e;                      // empty view

    std::cout << a << ' ' << b << ' ' << c << ' ' << d << ' ' << e.size() << '\n';
}
```

```output
hello world wide web wide literal 0
```

## What you can do with a view

A `string_view` has most of `std::string`'s **read-only** interface:

```cpp run
#include <iostream>
#include <string_view>

int main() {
    std::string_view path = "/home/ada/notes.txt";

    std::cout << path.size() << ' ' << path[1] << ' ' << path.front() << path.back() << '\n';
    std::cout << path.find("ada") << ' ' << path.rfind('/') << '\n';

    std::string_view file = path.substr(path.rfind('/') + 1);   // a view, no copy!
    std::cout << file << '\n';

    std::cout << std::boolalpha << path.starts_with("/home") << ' '
              << file.ends_with(".txt") << '\n';                    // C++20

    std::cout << (file == "notes.txt") << '\n';                   // compares text

    int dots = 0;
    for (char c : path) {
        if (c == '.') ++dots;
    }
    std::cout << dots << '\n';
}
```

```output
19 h /t
6 9
notes.txt
true true
true
1
```

`substr` on a view returns another **view** of the same characters, in constant time, no matter
how long it is. That's the big win over `std::string::substr`, which copies.

### Shrinking the window

`remove_prefix(n)` and `remove_suffix(n)` move the view's start or end inward. The underlying text
is not touched; only the view changes:

```cpp run
#include <iostream>
#include <string_view>

int main() {
    std::string_view s = "   padded text   ";
    while (!s.empty() && s.front() == ' ') s.remove_prefix(1);
    while (!s.empty() && s.back() == ' ') s.remove_suffix(1);
    std::cout << '[' << s << "]\n";
}
```

```output
[padded text]
```

## What a view can't do

A `string_view` is **read-only** and **doesn't own** anything:

- You can't modify characters through it (`sv[0] = 'x'` doesn't compile).
- There's no `+`, `+=`, `append`, `insert` or `replace`: it can't grow.
- There's no `c_str()`. A view is **not necessarily null-terminated**: `path.substr(1, 4)` points
  into the middle of a string, and the character after it is not `'\0'`. Never pass `sv.data()` to a
  function expecting a C string.

When you need a real string, construct one **explicitly**. Implicit conversion is deliberately not
allowed, because it costs an allocation:

```cpp run
#include <iostream>
#include <string>
#include <string_view>

int main() {
    std::string_view sv = "view";
    std::string owned(sv);              // explicit: copies the characters
    std::string other{sv};              // same
    owned += "er";                      // now it's a normal string
    std::string joined = std::string(sv) + "port";
    std::cout << owned << ' ' << other << ' ' << joined << '\n';
}
```

```output
viewer view viewport
```

```cpp compile-error
#include <string>
#include <string_view>

int main() {
    std::string_view sv = "view";
    std::string s = sv;   // error: conversion from 'std::string_view' to non-scalar type 'std::string' requested
}
```

```cpp compile-error
#include <string_view>

int main() {
    std::string_view sv = "abc";
    sv[0] = 'x';          // error: assignment of read-only location
}
```

## The big danger: dangling views

A view is only valid while the text it points to is alive and unchanged. If the owner goes away,
the view **dangles**, and using it is undefined behavior. The compiler usually won't stop you:

```cpp
std::string_view bad1 = std::string("temporary");   // the temporary string dies at the ';'
std::cout << bad1;                                   // UB

std::string_view firstWord() {
    std::string s = "hello world";
    return std::string_view(s).substr(0, 5);         // s is destroyed when the function returns
}                                                    // the caller gets a dangling view

std::string text = "short";
std::string_view v = text;
text += " but now much, much longer";                // may reallocate: v may now dangle
```

Safe rules of thumb:

- **Use `string_view` for function parameters** that only read text. The caller's string is alive
  for the whole call, so it's always safe.
- **Return `std::string`** from functions that create text. Return a `string_view` only if it views
  something that outlives the function, like a parameter or a literal.
- **Don't store** views in variables that outlive their source, and don't modify a string while a
  view of it is in use.

String literals live for the whole program, so views of literals never dangle.

## Choosing a type for text

| Situation | Use |
| --- | --- |
| Function parameter, read only | `std::string_view` (by value) |
| Function parameter you'll store or modify a copy of | `std::string` (by value) |
| Storing text in a variable or container | `std::string` |
| Returning newly built text | `std::string` |
| Passing to a C API | `std::string` + `.c_str()` |

:::quiz
What does `std::string_view` contain?

- [ ] Its own copy of the characters
- [x] A pointer to characters owned by something else, and a length
- [ ] A `std::string` and an index
- [ ] A null-terminated char array

It's a non-owning view: pointer plus length. That's why it's cheap and why it can dangle.
:::

:::quiz
Which of these are bugs? (select all that apply)

- [x] `std::string_view v = std::string("hi") + "!";` then printing `v`
- [ ] `void f(std::string_view s); f("hello");`
- [x] Returning a `string_view` of a local `std::string` from a function
- [ ] `std::string_view v = "literal";` then printing `v` later

The temporary string and the local string are destroyed while views still point at them. Literals
live for the whole program, and a parameter view is only used during the call.
:::

:::exercise Count by prefix {easy}
Write `bool hasPrefix(std::string_view word, std::string_view prefix)` that returns whether `word`
starts with `prefix`, **without** using `starts_with`: compare `prefix.size()` and use `substr` on the
view. Read a prefix, then words until the end of input, and print how many words start with it.

**Input:** a prefix, then zero or more words.
**Output:** the count, then a newline.

```cpp starter
#include <iostream>
#include <string>
#include <string_view>

int main() {
    std::string prefix;
    std::cin >> prefix;
    int count = 0;
    std::string word;
    while (std::cin >> word) {
    }
    std::cout << count << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <string_view>

bool hasPrefix(std::string_view word, std::string_view prefix) {
    return word.size() >= prefix.size() && word.substr(0, prefix.size()) == prefix;
}

int main() {
    std::string prefix;
    std::cin >> prefix;
    int count = 0;
    std::string word;
    while (std::cin >> word) {
        if (hasPrefix(word, prefix)) {
            ++count;
        }
    }
    std::cout << count << '\n';
}
```

```hint
A word that's shorter than the prefix can't start with it. Otherwise compare `word.substr(0, prefix.size())` with `prefix`.
```

```stdin
pre
prefix present pressure apple pre p
```

```expected
4
```

```stdin
zzz
apple banana
```

```expected hidden
0
```

```stdin
abc
ab abc abcd
```

```expected hidden
2
```

```stdin
x
```

```expected hidden
0
```

```checks
must bool\s+hasPrefix\s*\(\s*std::string_view\s+\w+\s*,\s*std::string_view\s+\w+\s*\) :: Write bool hasPrefix(std::string_view word, std::string_view prefix).
mustnot starts_with :: Implement it yourself with size() and substr().
must \.substr\s*\( :: Use substr on the view.
```
:::

:::exercise Trim {easy}
Write `std::string_view trim(std::string_view s)` that returns a view of `s` without leading and
trailing spaces (only the `' '` character), using `remove_prefix`/`remove_suffix`. Read lines until the
end of input and print each trimmed line inside square brackets.

**Input:** zero or more lines.
**Output:** `[trimmed]` for each line. A line of only spaces becomes `[]`.

```cpp starter
#include <iostream>
#include <string>
#include <string_view>

std::string_view trim(std::string_view s) {
    return s;
}

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::cout << '[' << trim(line) << "]\n";
    }
}
```

```cpp solution
#include <iostream>
#include <string>
#include <string_view>

std::string_view trim(std::string_view s) {
    while (!s.empty() && s.front() == ' ') {
        s.remove_prefix(1);
    }
    while (!s.empty() && s.back() == ' ') {
        s.remove_suffix(1);
    }
    return s;
}

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::cout << '[' << trim(line) << "]\n";
    }
}
```

```hint
Check `!s.empty()` before looking at `s.front()` or `s.back()`.
```

```hint
Returning the view is safe here: it points into `line`, which is still alive when `main` prints it.
```

```stdin
  hello  
world
   two words   
```

```expected
[hello]
[world]
[two words]
```

```stdin
     

x
```

```expected hidden
[]
[]
[x]
```

```stdin
	x  
a  b
```

```expected hidden
[	x]
[a  b]
```

```checks
must remove_prefix :: Use remove_prefix.
must remove_suffix :: Use remove_suffix.
```
:::

:::exercise Split into views {medium}
Write `std::vector<std::string_view> split(std::string_view text, char sep)` that splits `text` at
every `sep` character and returns the pieces as **views** into the original text (no copies). Empty
pieces count: `"a,,b"` has three pieces, and `""` has one empty piece. Read one line and a separator
character (on the next line), and print each piece as `i: piece`, numbered from 0.

**Input:** a line of text, then a line containing one separator character.
**Output:** one line per piece.

```cpp starter
#include <iostream>
#include <string>
#include <string_view>
#include <vector>

int main() {
    std::string line;
    std::getline(std::cin, line);
    char sep;
    std::cin >> sep;
    std::cout << "0: " << line << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <string_view>
#include <vector>

std::vector<std::string_view> split(std::string_view text, char sep) {
    std::vector<std::string_view> parts;
    while (true) {
        std::size_t pos = text.find(sep);
        if (pos == std::string_view::npos) {
            parts.push_back(text);
            return parts;
        }
        parts.push_back(text.substr(0, pos));
        text.remove_prefix(pos + 1);
    }
}

int main() {
    std::string line;
    std::getline(std::cin, line);
    char sep;
    std::cin >> sep;
    std::vector<std::string_view> parts = split(line, sep);
    for (std::size_t i = 0; i < parts.size(); ++i) {
        std::cout << i << ": " << parts[i] << '\n';
    }
}
```

```hint
Find the separator; the piece is `text.substr(0, pos)`. Then `text.remove_prefix(pos + 1)` and repeat.
```

```hint
When `find` returns `std::string_view::npos`, what's left of `text` is the last piece.
```

```stdin
red,green,blue
,
```

```expected
0: red
1: green
2: blue
```

```stdin
a;;b;
;
```

```expected hidden
0: a
1:
2: b
3:
```

```stdin
no separators here
,
```

```expected hidden
0: no separators here
```

```stdin
,x,
,
```

```expected hidden
0:
1: x
2:
```

```stdin

,
```

```expected hidden
0:
```

```checks
must std::vector\s*<\s*std::string_view\s*>\s+split\s*\(\s*std::string_view :: Write std::vector<std::string_view> split(std::string_view text, char sep).
```
:::

:::exercise Word wrap {hard}
Text editors "re-flow" paragraphs to fit a width. Read a width `W`, then all the text until the end of
the input (it can span several lines). A **word** is a maximal run of characters that aren't spaces,
tabs or newlines. Re-flow the words **greedily**: put as many words on each output line as fit in `W`
characters, separated by single spaces, then start a new line. A word longer than `W` gets a line of
its own (words are never broken).

Write `std::vector<std::string_view> splitWords(std::string_view text)` that returns the words as
**views** into the text you read (so the text must stay alive while you use them).

**Input:** `W` (1 to 80) on the first line, then zero or more lines of text.
**Output:** the wrapped lines. Nothing at all if there are no words.

Example, with `W = 20`: `The quick brown fox jumps over the lazy dog.` becomes
`The quick brown fox` / `jumps over the lazy` / `dog.`.

```cpp starter
#include <iostream>
#include <string>
#include <string_view>
#include <vector>

int main() {
    std::size_t width;
    std::cin >> width;
}
```

```cpp solution
#include <iostream>
#include <string>
#include <string_view>
#include <vector>

bool isSpace(char c) {
    return c == ' ' || c == '\t' || c == '\n' || c == '\r';
}

std::vector<std::string_view> splitWords(std::string_view text) {
    std::vector<std::string_view> words;
    while (true) {
        while (!text.empty() && isSpace(text.front())) {
            text.remove_prefix(1);                  // skip the gap before the next word
        }
        if (text.empty()) {
            return words;
        }
        std::size_t length = 0;
        while (length < text.size() && !isSpace(text[length])) {
            ++length;
        }
        words.push_back(text.substr(0, length));    // a view: no characters are copied
        text.remove_prefix(length);
    }
}

int main() {
    std::size_t width;
    std::cin >> width;

    std::string text;                               // owns the characters the views look at
    std::string line;
    while (std::getline(std::cin, line)) {
        text += line;
        text += '\n';
    }

    std::string current;
    for (std::string_view word : splitWords(text)) {
        if (current.empty()) {
            current += word;
        } else if (current.size() + 1 + word.size() <= width) {
            current += ' ';
            current += word;
        } else {
            std::cout << current << '\n';
            current = std::string(word);
        }
    }
    if (!current.empty()) {
        std::cout << current << '\n';
    }
}
```

```hint
Read everything into one `std::string`: `while (std::getline(std::cin, line)) { text += line; text += '\n'; }`.
Newlines then become ordinary separators.
```

```hint
To split: skip separators with `remove_prefix(1)`, count the length of the next word, take
`text.substr(0, length)` (a view), then `remove_prefix(length)` and repeat until the view is empty.
```

```hint
Build the current output line in a `std::string`. A word fits if
`current.size() + 1 + word.size() <= width` (the `+ 1` is the space). If it doesn't fit, print the
line and start a new one with the word. Don't forget the last line.
```

```stdin
20
The quick brown fox jumps over the lazy dog.
```

```expected
The quick brown fox
jumps over the lazy
dog.
```

```stdin
10
a supercalifragilistic word
```

```expected
a
supercalifragilistic
word
```

```stdin
12
  Hello,   world!	This
is    a   test.

  Bye
```

```expected hidden
Hello,
world! This
is a test.
Bye
```

```stdin
5
abc d efgh ij
```

```expected hidden
abc d
efgh
ij
```

```stdin
7
   
	
```

```expected hidden
```

```stdin
1
a b cd
```

```expected hidden
a
b
cd
```

```checks
must std::vector\s*<\s*std::string_view\s*>\s+splitWords\s*\(\s*std::string_view :: Write std::vector<std::string_view> splitWords(std::string_view text).
must remove_prefix|substr :: Slice the text with string_view operations (substr, remove_prefix).
```
:::
