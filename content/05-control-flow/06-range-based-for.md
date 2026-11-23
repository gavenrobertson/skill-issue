---
title: Range-Based for
summary: Visiting every element of an array, a string, or a braced list with for (x : range), copying vs auto& vs const auto&, C++20's range-for with an initializer, and what to do when you need the index.
---

A very common job for a loop is "do something with **every element** of a collection". With a classic
`for` you have to manage an index, get the bounds right, and look up each element. The **range-based
`for`** loop (C++11) does all of that for you:

```cpp
for (declaration : range) {
    // body runs once per element; the declared variable holds the current element
}
```

Read the colon as "**in**": "for each `c` in `word`".

## Over a string

A `std::string` is a sequence of `char`s, so a range-for visits each character in order:

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string word = "loop";
    for (char c : word) {
        std::cout << '[' << c << ']';
    }
    std::cout << '\n';
}
```

```output
[l][o][o][p]
```

No index, no `.size()`, no chance of an off-by-one error.

## Over an array

You'll study arrays later. For now: `int scores[] = {90, 72, 85};` creates a fixed-size sequence of three
`int`s, and a range-for walks through it:

```cpp run
#include <iostream>

int main() {
    int scores[] = {90, 72, 85, 64};
    int total = 0;
    for (int s : scores) {
        total += s;
    }
    std::cout << "total = " << total << '\n';
}
```

```output
total = 311
```

Later you'll use range-for the same way with `std::vector`, `std::map`, and every other standard
container. Anything that has a "beginning" and an "end" works.

## Over a braced list

You can loop directly over a list of values written in braces:

```cpp run
#include <initializer_list>
#include <iostream>

int main() {
    for (int x : {2, 3, 5, 7, 11}) {
        std::cout << x << ' ';
    }
    std::cout << '\n';

    int a = 4, b = 9, c = 1;
    int biggest = a;
    for (int x : {a, b, c}) {             // handy for "the max of a few variables"
        if (x > biggest) {
            biggest = x;
        }
    }
    std::cout << "biggest = " << biggest << '\n';
}
```

```output
2 3 5 7 11 
biggest = 9
```

The braces create a `std::initializer_list`. Strictly, you should `#include <initializer_list>` for this
(in practice `<iostream>` usually pulls it in already).

You **can't** loop over something that isn't a sequence:

```cpp compile-error
#include <iostream>

int main() {
    int n = 5;
    for (int x : n) {          // error: 'begin' was not declared in this scope
        std::cout << x;
    }
}
```

## The loop variable: copy, `auto&`, or `const auto&`

The declaration before the colon decides how the loop variable relates to each element.

### By value: a copy

`for (char c : word)` makes `c` a **copy** of each element. Changing `c` changes only the copy:

```cpp run warns
#include <iostream>
#include <string>

int main() {
    std::string word = "abc";
    for (char c : word) {
        c = 'X';                  // modifies the copy only
    }
    std::cout << word << '\n';    // unchanged
}
```

```output
abc
```

GCC even hints at the problem: `variable 'c' set but not used`. The assignment has no visible effect.

### By reference: `&` to modify the elements

Put `&` after the type to make the loop variable a **reference**: another name for the element itself,
not a copy. (References get a full lesson later.) Now changes go straight into the collection:

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string word = "abc";
    for (char& c : word) {
        c = c - 'a' + 'A';        // turn the lowercase letter into uppercase, in place
    }
    std::cout << word << '\n';

    int values[] = {1, 2, 3};
    for (int& v : values) {
        v *= 10;
    }
    for (int v : values) {
        std::cout << v << ' ';
    }
    std::cout << '\n';
}
```

```output
ABC
10 20 30 
```

### `auto`

Instead of spelling out the element type, let the compiler deduce it with `auto`. The `&` and `const`
rules stay the same:

| Declaration | Meaning | Use it when |
| --- | --- | --- |
| `for (auto x : r)` | a **copy** of each element | elements are small (numbers, chars) and you only read them |
| `for (auto& x : r)` | a **reference**: changes affect the collection | you want to modify the elements |
| `for (const auto& x : r)` | a **read-only reference**: no copy, no changes | elements are big (strings, objects) and you only read them |

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string names[] = {"Ada", "Grace", "Linus"};

    for (const auto& name : names) {          // no copying of strings, read-only
        std::cout << name << " has " << name.size() << " letters\n";
    }

    for (auto& name : names) {                // modify in place
        name += "!";
    }

    for (const auto& name : names) {
        std::cout << name << ' ';
    }
    std::cout << '\n';
}
```

```output
Ada has 3 letters
Grace has 5 letters
Linus has 5 letters
Ada! Grace! Linus! 
```

Copying an `int` is free, but copying a long `std::string` on every iteration costs time and memory.
That's why `const auto&` is the default choice for anything bigger than a number.

A `const` reference can't be used to change anything:

```cpp compile-error
#include <string>

int main() {
    std::string word = "abc";
    for (const auto& c : word) {
        c = 'X';                 // error: assignment of read-only reference 'c'
    }
}
```

> **Note:** GCC warns if you write `for (const std::string s : names)`: `loop variable 's' creates a copy
> from type 'const std::string'`. A `const` copy is the worst of both worlds: you pay for the copy but
> can't modify it. Add the `&`.

## When you need the index

A range-for gives you the elements, not their positions. If you need the position, you have three options.

**1. A classic `for` loop** with an index. Use `std::size_t` (unsigned) to compare against `.size()`
without a warning:

```cpp
for (std::size_t i = 0; i < word.size(); ++i) {
    std::cout << i << ": " << word[i] << '\n';    // word[i] is the character at position i
}
```

**2. A counter declared before the loop:**

```cpp
int i = 0;
for (char c : word) {
    std::cout << i << ": " << c << '\n';
    ++i;
}
// i is still in scope here, even though nothing needs it
```

**3. C++20: range-for with an initializer.** Just like `if (init; cond)`, a range-for can begin with an
init-statement, which keeps the counter scoped to the loop:

```cpp run
#include <iostream>
#include <string>

int main() {
    std::string word = "hey";
    for (int i = 0; char c : word) {
        std::cout << i << ": " << c << '\n';
        ++i;
    }
}
```

```output
0: h
1: e
2: y
```

The initializer can also hold the thing you loop over, so it doesn't leak into the surrounding scope:

```cpp run
#include <iostream>
#include <string>

int main() {
    for (std::string greeting = "hi!"; char c : greeting) {
        std::cout << c << c;
    }
    std::cout << '\n';
}
```

```output
hhii!!
```

Use a classic `for` when you need more control than "every element, front to back": going backwards,
skipping elements, stepping by 2, or comparing neighbors.

:::quiz
What does this print?

```cpp
std::string s = "cat";
for (char c : s) {
    c = 'z';
}
std::cout << s;
```

- [x] `cat`
- [ ] `zzz`
- [ ] `z`
- [ ] It doesn't compile

`c` is a copy of each character, so assigning to it doesn't change `s`. Use `char& c` to modify the string.
:::

:::quiz
You want to print every string in a large collection of `std::string`s without copying them and without
being able to modify them by accident. Which loop?

- [ ] `for (auto s : names)`
- [ ] `for (auto& s : names)`
- [x] `for (const auto& s : names)`
- [ ] `for (const auto s : names)`

`const auto&` refers to each element directly (no copy) and makes it read-only.
:::

:::exercise Count vowels
Read one word and count its vowels (`a e i o u`, lowercase only) using a range-based `for` loop.

**Input:** one word in lowercase letters.
**Output:** `Vowels: N`

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string word;
    std::cin >> word;
    int count = 0;
    // visit each character of word
    std::cout << "Vowels: " << count << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string word;
    std::cin >> word;
    int count = 0;
    for (char c : word) {
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') {
            ++count;
        }
    }
    std::cout << "Vowels: " << count << '\n';
}
```

```hint
`for (char c : word) { ... }` visits every character.
```

```hint
A `switch (c)` with grouped `case 'a': case 'e': ...` labels works nicely too.
```

```stdin
education
```

```expected
Vowels: 5
```

```stdin
rhythm
```

```expected
Vowels: 0
```

```stdin
a
```

```expected hidden
Vowels: 1
```

```checks
must for\s*\([^;)]*[^:]:[^:] :: Use a range-based for loop (for (char c : word)).
```
:::

:::exercise Shout
Read a whole line and convert every lowercase letter in it to uppercase **in place**, using a range-based
`for` with a reference. Other characters stay as they are.

**Input:** one line of text.
**Output:** the same line with all lowercase letters `a`-`z` turned into uppercase.

Hint: for a lowercase letter `c`, the uppercase letter is `c - 'a' + 'A'`.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    for (char c : line) {
        if (c >= 'a' && c <= 'z') {
            c = c - 'a' + 'A';
        }
    }
    std::cout << line << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);
    for (char& c : line) {
        if (c >= 'a' && c <= 'z') {
            c = c - 'a' + 'A';
        }
    }
    std::cout << line << '\n';
}
```

```hint
The starter changes copies of the characters. What one character turns the loop variable into a
reference to the real character?
```

```stdin
hello, world!
```

```expected
HELLO, WORLD!
```

```stdin
C++ is Fun 4 all
```

```expected
C++ IS FUN 4 ALL
```

```stdin
ALREADY LOUD
```

```expected hidden
ALREADY LOUD
```

```checks
must for\s*\(\s*(auto|char)\s*&[^;)]*: :: Loop with a reference: for (char& c : line) or for (auto& c : line).
```
:::

:::exercise Max and min of five
Read five integers into five variables, then find the largest and smallest by looping over a braced list
of them: `for (int x : {a, b, c, d, e})`.

**Input:** five integers.
**Output:**

```
Max: <largest>
Min: <smallest>
```

```cpp starter
#include <initializer_list>
#include <iostream>

int main() {
    int a = 0, b = 0, c = 0, d = 0, e = 0;
    std::cin >> a >> b >> c >> d >> e;
    int max = a;
    int min = a;
    std::cout << "Max: " << max << '\n';
    std::cout << "Min: " << min << '\n';
}
```

```cpp solution
#include <initializer_list>
#include <iostream>

int main() {
    int a = 0, b = 0, c = 0, d = 0, e = 0;
    std::cin >> a >> b >> c >> d >> e;
    int max = a;
    int min = a;
    for (int x : {a, b, c, d, e}) {
        if (x > max) {
            max = x;
        }
        if (x < min) {
            min = x;
        }
    }
    std::cout << "Max: " << max << '\n';
    std::cout << "Min: " << min << '\n';
}
```

```hint
Start both `max` and `min` at the first value, then compare every value in the list against them.
```

```stdin
3 9 -2 7 4
```

```expected
Max: 9
Min: -2
```

```stdin
5 5 5 5 5
```

```expected
Max: 5
Min: 5
```

```stdin
-1 -8 -3 -9 -2
```

```expected hidden
Max: -1
Min: -9
```

```checks
must for\s*\([^;)]*:\s*\{ :: Loop over a braced list: for (int x : {a, b, c, d, e}).
```
:::

:::exercise Find the positions
Read a word and a character, and print every position (counting from 0) where that character occurs in
the word. Use a C++20 range-based `for` with an initializer to keep track of the position.

**Input:** a word and a character, e.g. `banana a`.
**Output:** `Found at: ` followed by the positions separated by single spaces (e.g. `Found at: 1 3 5`), or
`Not found` if the character doesn't occur in the word.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string word;
    char target = ' ';
    std::cin >> word >> target;
    std::cout << "Not found\n";
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string word;
    char target = ' ';
    std::cin >> word >> target;

    int found = 0;
    for (int i = 0; char c : word) {
        if (c == target) {
            if (found == 0) {
                std::cout << "Found at:";
            }
            std::cout << ' ' << i;
            ++found;
        }
        ++i;
    }

    if (found == 0) {
        std::cout << "Not found";
    }
    std::cout << '\n';
}
```

```hint
`for (int i = 0; char c : word) { ...; ++i; }` gives you both the position and the character.
```

```hint
Print `Found at:` only the first time you find a match, then `' '` and the position for every match.
```

```stdin
banana a
```

```expected
Found at: 1 3 5
```

```stdin
hello z
```

```expected
Not found
```

```stdin
x x
```

```expected hidden
Found at: 0
```

```stdin
Mississippi s
```

```expected hidden
Found at: 2 3 5 6
```

```checks
must for\s*\([^;)]*;[^;)]*[^:]:[^:] :: Use a range-based for with an initializer: for (int i = 0; char c : word).
```
:::
