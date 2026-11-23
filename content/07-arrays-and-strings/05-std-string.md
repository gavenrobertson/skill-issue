---
title: std::string
summary: Text done right. Creating, joining, comparing, slicing, searching and editing strings, converting to and from numbers, and reading words vs whole lines.
---

## What is `std::string`?

A `std::string` (from `<string>`) is a **sequence of characters** that manages its own memory, so it
can grow and shrink as needed. Think of it as a `std::vector<char>` specialized for text, with lots
of text-friendly operations. It's the type to use for text in C++.

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string name = "Ada";
    std::string greeting = "Hello, " + name + "!";
    std::cout << greeting << '\n';
    std::cout << greeting.size() << " characters\n";
}
```

```output
Hello, Ada!
11 characters
```

## Creating strings

```cpp run
#include <iostream>
#include <string>

using namespace std::string_literals;   // enables the "..."s suffix

int main() {
    std::string a;                     // empty string ""
    std::string b = "hello";           // from a string literal
    std::string c("hello");            // same, constructor syntax
    std::string d{"hello"};            // same, brace syntax
    std::string e(5, '*');             // 5 copies of a char: "*****"
    std::string f = b;                 // copy
    std::string g(b, 1, 3);            // substring of b: from index 1, 3 chars: "ell"
    auto h = "literal"s;               // the s suffix makes a std::string, not a C string

    std::cout << '[' << a << "] " << b << ' ' << c << ' ' << d << ' ' << e << ' '
              << f << ' ' << g << ' ' << h << '\n';
}
```

```output
[] hello hello hello ***** hello ell literal
```

> **Pitfall:** `std::string e(5, '*')` is five stars, but `std::string e{5, '*'}` uses braces and
> means "a list of characters": the char with code 5, then `*`. Same trap as `std::vector`.

## Length, emptiness and characters

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string word = "rocket";

    std::cout << word.size() << ' ' << word.length() << '\n';   // identical: 6
    std::cout << std::boolalpha << word.empty() << '\n';

    std::cout << word[0] << word.back() << '\n';   // first and last char: 'r' 't'
    word[0] = 'p';                                 // strings are mutable
    word.front() = 'P';
    std::cout << word << ' ' << word.at(1) << '\n'; // .at() is bounds-checked
}
```

```output
6 6
false
rt
Pocket o
```

`size()` and `length()` are the same function under two names. Indexing works exactly like a vector:
`[]` is unchecked (UB out of range), `.at()` throws `std::out_of_range`. Each element is a `char`.

## Concatenation: `+` and `+=`

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string first = "Grace";
    std::string last = "Hopper";

    std::string full = first + " " + last;   // string + literal + string
    full += '!';                             // append a char
    full += " (1906)";                       // append a literal
    full.append(" admiral");                 // append() does the same as +=
    full.push_back('.');                     // append one char

    std::cout << full << '\n';
}
```

```output
Grace Hopper! (1906) admiral.
```

`+` needs at least one `std::string` on one side. Two string **literals** are C arrays, not
`std::string`s, and can't be added:

```cpp compile-error
#include <string>

int main() {
    std::string s = "Hello, " + "World";   // error: invalid operands of types 'const char [8]' and 'const char [6]' to binary 'operator+'
}
```

Fixes: `std::string("Hello, ") + "World"`, `"Hello, "s + "World"`, or just write one literal.
`std::string s = "Hello, " + name + "!";` is fine, because `"Hello, " + name` already gives a
`std::string`.

> **Warning:** `"abc" + 1` *compiles*, but it doesn't append anything: it's pointer arithmetic and
> gives `"bc"`. And `s + 5` doesn't append `"5"`; use `s + std::to_string(5)`.

## Comparing

`==`, `!=`, `<`, `<=`, `>`, `>=` compare **contents**, character by character (lexicographically, like a
dictionary), and it's case-sensitive: every uppercase letter sorts before every lowercase letter,
because that's how their character codes compare.

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string a = "apple";
    std::string b = "banana";
    std::cout << std::boolalpha;
    std::cout << (a == "apple") << ' ' << (a < b) << '\n';
    std::cout << (std::string("Zebra") < "apple") << '\n';   // 'Z' (90) < 'a' (97)
    std::cout << (std::string("app") < "apple") << '\n';     // a prefix is smaller
}
```

```output
true true
true
true
```

## Substrings: `substr`

`s.substr(pos, count)` returns a new string with `count` characters starting at index `pos`. If
`count` is left out or runs past the end, you get everything to the end.

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string s = "Hello, World";
    std::cout << s.substr(0, 5) << '\n';    // "Hello"
    std::cout << s.substr(7) << '\n';       // "World" (to the end)
    std::cout << s.substr(7, 100) << '\n';  // "World" (count is clipped)
    std::cout << '[' << s.substr(12) << "]\n";   // "" (pos == size is allowed)
}
```

```output
Hello
World
World
[]
```

A `pos` greater than `size()` throws `std::out_of_range`.

## Searching: `find` and `rfind`

`s.find(x)` returns the index of the **first** occurrence of `x` (a string, literal or char), or the
special value **`std::string::npos`** if it isn't there. `rfind` searches from the end. Both take an
optional start position.

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string s = "the cat sat on the mat";

    std::cout << s.find("the") << '\n';        // 0
    std::cout << s.find("the", 1) << '\n';     // 15: search starting at index 1
    std::cout << s.rfind("at") << '\n';        // 20: last occurrence
    std::cout << s.find('s') << '\n';          // 8: chars work too

    if (s.find("dog") == std::string::npos) {
        std::cout << "no dog\n";
    }

    // count every occurrence
    int count = 0;
    for (std::size_t pos = s.find("at"); pos != std::string::npos; pos = s.find("at", pos + 1)) {
        ++count;
    }
    std::cout << "\"at\" appears " << count << " times\n";
}
```

```output
0
15
20
8
no dog
"at" appears 3 times
```

`npos` is the largest `std::size_t` value. Always compare with `std::string::npos` rather than
checking `< 0` or `== -1`: the result is unsigned, so it's never negative.

> **Pitfall:** Storing the result in an `int` (`int pos = s.find(...)`) mangles `npos`. Use
> `std::size_t` or `auto`.

Related searches: `find_first_of("aeiou")` finds the first character that is *any* of those,
`find_first_not_of(" ")` skips leading spaces. C++20 added `s.starts_with("pre")` and
`s.ends_with(".txt")`; C++23 adds `s.contains("x")`.

## Editing in place: `replace`, `insert`, `erase`

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string s = "I like cats";

    s.replace(7, 4, "dogs");     // replace 4 chars at index 7 with "dogs"
    std::cout << s << '\n';

    s.insert(2, "really ");      // insert before index 2
    std::cout << s << '\n';

    s.erase(0, 2);               // erase 2 chars starting at index 0
    std::cout << s << '\n';

    s.erase(6);                  // erase from index 6 to the end
    std::cout << s << '\n';

    s.pop_back();                // remove the last char
    std::cout << s << '\n';

    s.clear();                   // now empty
    std::cout << '[' << s << "]\n";
}
```

```output
I like dogs
I really like dogs
really like dogs
really
reall
[]
```

`find` and `replace` together give "search and replace":

```cpp
std::size_t pos = s.find("old");
if (pos != std::string::npos) {
    s.replace(pos, 3, "new");     // 3 == length of "old"
}
```

## Looping over characters

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string s = "banana";

    int as = 0;
    for (char c : s) {                 // read each char
        if (c == 'a') ++as;
    }

    for (char& c : s) {                // modify each char through a reference
        if (c == 'a') c = 'o';
    }

    std::string reversed;
    for (std::size_t i = s.size(); i-- > 0;) {
        reversed += s[i];
    }
    std::cout << as << ' ' << s << ' ' << reversed << '\n';
}
```

```output
3 bonono ononob
```

## Numbers to strings and back

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string s = "Score: " + std::to_string(42);   // int -> string
    std::cout << s << '\n';
    std::cout << std::to_string(2.5) << '\n';          // doubles get 6 decimals

    int n = std::stoi("123");                          // string -> int
    double d = std::stod("3.75");                      // string -> double
    long long big = std::stoll("9000000000");          // string -> long long
    std::cout << n + 1 << ' ' << d * 2 << ' ' << big << '\n';

    std::cout << std::stoi("  42abc") << '\n';         // skips leading spaces, stops at the first non-digit
}
```

```output
Score: 42
2.500000
124 7.5 9000000000
42
```

`std::stoi("abc")` (no number at all) throws `std::invalid_argument`, and a number too big for the
type throws `std::out_of_range`. Exceptions come later; for now, make sure the text holds a number.

## Reading words vs lines

`std::cin >> s` reads one **word**: it skips leading whitespace and stops at the next space, tab or
newline. `std::getline(std::cin, s)` reads a whole **line**, spaces included, and discards the newline.

```
Input:   Ada Lovelace
         London

std::cin >> s;               // s == "Ada"
std::getline(std::cin, s);   // s == " Lovelace"  (the rest of the first line)
std::getline(std::cin, s);   // s == "London"
```

> **Pitfall:** After `std::cin >> number;`, the newline you typed is still waiting in the input.
> A following `std::getline` reads that empty remainder and returns `""` immediately. Fix it with
> `std::getline(std::cin >> std::ws, line);`, where `std::ws` skips leading whitespace first.

:::quiz
What does this print?

```cpp
std::string s = "programming";
std::cout << s.substr(3, 4);
```

- [x] `gram`
- [ ] `ogra`
- [ ] `gramm`
- [ ] `ramm`

Index 3 is `g` (p=0, r=1, o=2, g=3), and 4 characters from there are `gram`.
:::

:::quiz
How do you check that `"xyz"` does **not** occur in `s`?

- [ ] `s.find("xyz") == -1`
- [ ] `s.find("xyz") < 0`
- [x] `s.find("xyz") == std::string::npos`
- [ ] `!s.find("xyz")`

`find` returns the unsigned `npos` when nothing is found. The last option is true when the match is at index 0!
:::

:::quiz
Which lines compile? (select all that apply)

- [x] `std::string a = std::string("x") + "y";`
- [ ] `std::string b = "x" + "y";`
- [x] `std::string c = "x"; c += "y";`
- [x] `std::string d = "n=" + std::to_string(3);`

Two string literals can't be added with `+`; at least one side must be a `std::string`.
:::

:::exercise Palindrome {easy}
Read one word and print `yes` if it reads the same forwards and backwards (case-sensitive), otherwise
`no`.

**Input:** one word.
**Output:** `yes` or `no`.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string word;
    std::cin >> word;
    std::cout << "no\n";
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string word;
    std::cin >> word;
    bool palindrome = true;
    for (std::size_t i = 0; i < word.size() / 2; ++i) {
        if (word[i] != word[word.size() - 1 - i]) {
            palindrome = false;
            break;
        }
    }
    std::cout << (palindrome ? "yes" : "no") << '\n';
}
```

```hint
Compare `word[i]` with `word[word.size() - 1 - i]` for the first half of the word.
```

```stdin
racecar
```

```expected
yes
```

```stdin
rocket
```

```expected
no
```

```stdin
a
```

```expected hidden
yes
```

```stdin
Abba
```

```expected hidden
no
```

```stdin
abcda
```

```expected hidden
no
```

```stdin
noon
```

```expected hidden
yes
```
:::

:::exercise Key and value {medium}
Each input line should look like `key=value`. For each line, split it at the **first** `=` using
`find` and `substr`, and print `key -> value`. Lines without any `=` print `invalid`. The value may
be empty and may itself contain `=`.

**Input:** zero or more lines.
**Output:** one line per input line.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::cout << line << '\n';
    }
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::size_t eq = line.find('=');
        if (eq == std::string::npos) {
            std::cout << "invalid\n";
        } else {
            std::cout << line.substr(0, eq) << " -> " << line.substr(eq + 1) << '\n';
        }
    }
}
```

```hint
`std::size_t eq = line.find('=');` then check it against `std::string::npos`.
```

```hint
The key is `line.substr(0, eq)` and the value is `line.substr(eq + 1)`.
```

```stdin
name=Ada
lang=C++
```

```expected
name -> Ada
lang -> C++
```

```stdin
nothing here
empty=
eq=a=b
```

```expected hidden
invalid
empty ->
eq -> a=b
```

```stdin
=value
==
k=v=
```

```expected hidden
 -> value
 -> =
k -> v=
```

```checks
must \.find\s*\( :: Locate the '=' with find.
must \.substr\s*\( :: Extract the parts with substr.
must npos :: Compare the result of find with std::string::npos.
```
:::

:::exercise Sum a CSV line {medium}
Read one line of comma-separated integers, like `3,14,-2`, and print their sum. Split the line with
`find` and `substr`, and convert each piece with `std::stoi`.

**Input:** one line of one or more integers separated by commas (no spaces).
**Output:** the sum, then a newline.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::cout << 0 << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    int sum = 0;
    std::size_t start = 0;
    while (true) {
        std::size_t comma = line.find(',', start);
        if (comma == std::string::npos) {
            sum += std::stoi(line.substr(start));
            break;
        }
        sum += std::stoi(line.substr(start, comma - start));
        start = comma + 1;
    }
    std::cout << sum << '\n';
}
```

```hint
Keep a `start` index. Find the next comma from `start`; the piece is `line.substr(start, comma - start)`.
```

```hint
When `find` returns `npos`, the last piece is `line.substr(start)`.
```

```stdin
3,14,-2
```

```expected
15
```

```stdin
42
```

```expected hidden
42
```

```stdin
-1,-1,-1,100,0
```

```expected hidden
97
```

```stdin
0,-0,10,-10
```

```expected hidden
0
```

```checks
must stoi :: Convert each piece with std::stoi.
must \.find\s*\( :: Find the commas with find.
```
:::

:::exercise Replace all {hard}
Read three lines: a `text`, a non-empty `from` string, and a `to` string (may be empty). Replace
**every** occurrence of `from` in `text` with `to`, scanning left to right, and print the result.
Replacements must not be scanned again (so replacing `a` with `aa` doesn't loop forever).

**Input:** three lines: `text`, `from`, `to`.
**Output:** the new text, then a newline.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string text, from, to;
    std::getline(std::cin, text);
    std::getline(std::cin, from);
    std::getline(std::cin, to);
    std::cout << text << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string text, from, to;
    std::getline(std::cin, text);
    std::getline(std::cin, from);
    std::getline(std::cin, to);

    std::size_t pos = text.find(from);
    while (pos != std::string::npos) {
        text.replace(pos, from.size(), to);
        pos = text.find(from, pos + to.size());
    }
    std::cout << text << '\n';
}
```

```hint
After replacing at `pos`, continue searching from `pos + to.size()`, just past the inserted text.
```

```stdin
the cat sat on the mat
at
og
```

```expected
the cog sog on the mog
```

```stdin
banana
a
aa
```

```expected hidden
baanaanaa
```

```stdin
hello world
xyz
abc
```

```expected hidden
hello world
```

```stdin
a-b-c
-

```

```expected hidden
abc
```

```stdin
a--b--
-

```

```expected hidden
ab
```

```stdin
aaaaa
aa
b
```

```expected hidden
bba
```

```stdin
abababa
aba
X
```

```expected hidden
XbX
```

```stdin
cat
cat
catcat
```

```expected hidden
catcat
```

```checks
must \.replace\s*\( :: Use the replace member function.
must \.find\s*\( :: Use find to locate each occurrence.
```
:::
