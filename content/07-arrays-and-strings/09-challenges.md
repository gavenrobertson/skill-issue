---
title: "Arrays & Strings: Challenges"
summary: Six hard problems that combine arrays, vectors, strings, characters and views with loops and functions. Real programming tasks with tricky edge cases.
---

These problems are meant to be **hard**. Each one is a small, complete program: you get a precise
specification, and you design the solution yourself. The starters are just an empty `main`. Read the
spec slowly, work through the examples on paper, think about the edge cases (empty input, a single
element, repeated values, the largest sizes), and only then start coding.

Try each problem for a good while before you open a hint. Getting stuck and then unstuck is exactly the
practice that makes the ideas from this module stick. Everything here can be solved with what you've
learned so far: C arrays, `std::array`, `std::vector`, `std::string`, `<cctype>` and
`std::string_view`, plus the loops and functions from earlier modules.

:::quiz
What does this print?

```cpp
std::vector<int> a(3, 7);
std::vector<int> b{3, 7};
std::string s = "abc";
std::cout << a.size() << b.size() << s + 'd' << "xy" + 1;
```

- [ ] `23abcdxy1`
- [x] `32abcdy`
- [ ] `32abcdxy1`
- [ ] `22abcdy`

`a(3, 7)` is three 7s (size 3), while `b{3, 7}` is the two elements 3 and 7 (size 2). `s + 'd'` appends
a character. But `"xy" + 1` is **pointer arithmetic** on the literal: it points one character further,
at `"y"`.
:::

:::quiz
What does this print?

```cpp
int arr[5] = {1, 2};
std::string t = "hello";
std::size_t pos = t.find('z');
std::cout << arr[4] << ' ' << t.substr(1, 3) << ' '
          << (pos == std::string::npos) << ' ' << t.size() - 6 + 1;
```

- [x] `0 ell 1 0`
- [ ] `0 ell 1 -0`
- [ ] `0 ell 0 0`
- [ ] `0 ell 1 18446744073709551615`

Missing initializers are zero, so `arr[4]` is 0. `substr(1, 3)` is `ell`. `find` returns `npos` when
nothing is found. And `t.size() - 6` is unsigned: 5 - 6 wraps around to the largest `std::size_t`,
and adding 1 wraps around again to exactly 0. Unsigned arithmetic never goes negative.
:::

:::exercise Spiral order {hard}
Print the elements of a matrix in **clockwise spiral order**: along the top row from left to right, down
the right column, along the bottom row from right to left, up the left column, and then the same again
for the inner rectangle, until every element has been printed exactly once.

```
1  2  3  4
5  6  7  8      ->   1 2 3 4 8 12 11 10 9 5 6 7
9 10 11 12
```

**Input:** `R C` (1 to 20 each), then `R` lines of `C` integers.
**Output:** all `R * C` numbers in spiral order on one line, separated by single spaces.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <vector>

int main() {
    int rows, cols;
    std::cin >> rows >> cols;
    std::vector<std::vector<int>> m(rows, std::vector<int>(cols));
    for (auto& row : m) {
        for (int& x : row) {
            std::cin >> x;
        }
    }

    // The unvisited part is always the rectangle [top..bottom] x [left..right].
    int top = 0;
    int bottom = rows - 1;
    int left = 0;
    int right = cols - 1;
    std::vector<int> order;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; ++c) order.push_back(m[top][c]);
        ++top;
        for (int r = top; r <= bottom; ++r) order.push_back(m[r][right]);
        --right;
        if (top <= bottom) {                       // a bottom row is left only if rows remain
            for (int c = right; c >= left; --c) order.push_back(m[bottom][c]);
            --bottom;
        }
        if (left <= right) {                       // a left column is left only if columns remain
            for (int r = bottom; r >= top; --r) order.push_back(m[r][left]);
            ++left;
        }
    }

    for (std::size_t i = 0; i < order.size(); ++i) {
        std::cout << order[i] << (i + 1 < order.size() ? " " : "\n");
    }
}
```

```hint
Keep four boundaries: `top`, `bottom`, `left`, `right`. Walk the top row, then move `top` down by one;
walk the right column, then move `right` left by one; and so on.
```

```hint
The classic bug is printing the middle row (or column) twice. Before walking the bottom row backwards,
check that `top <= bottom` is still true, and before walking the left column up, check `left <= right`.
Test with a single row and a single column.
```

```stdin
3 4
1 2 3 4
5 6 7 8
9 10 11 12
```

```expected
1 2 3 4 8 12 11 10 9 5 6 7
```

```stdin
3 3
1 2 3
4 5 6
7 8 9
```

```expected
1 2 3 6 9 8 7 4 5
```

```stdin
1 5
5 4 3 2 1
```

```expected hidden
5 4 3 2 1
```

```stdin
4 1
1
2
3
4
```

```expected hidden
1 2 3 4
```

```stdin
1 1
-7
```

```expected hidden
-7
```

```stdin
4 3
1 2 3
4 5 6
7 8 9
10 11 12
```

```expected hidden
1 2 3 6 9 12 11 10 7 4 5 8
```

```stdin
3 5
1 2 3 4 5
6 7 8 9 10
11 12 13 14 15
```

```expected hidden
1 2 3 4 5 10 15 14 13 12 11 6 7 8 9
```
:::

:::exercise Run-length encoding {hard}
**Run-length encoding** compresses text by replacing each run of repeated characters with the character
followed by the run's length. In this format, a run of length 1 is written as just the character (no
`1`), and longer runs as the character followed by the count in decimal: `aaabccdddd` encodes to
`a3bc2d4`, and twelve `z`s encode to `z12`.

Each input line is a command: `encode TEXT` or `decode TEXT`, where `TEXT` is everything after the
first space (it may contain spaces and punctuation, but never digits). A line with just the command has
an empty `TEXT`. For `encode`, print the encoding of `TEXT`; for `decode`, `TEXT` is a valid encoding,
and you print the original text. Counts can have several digits.

**Input:** one command per line, until the end of input.
**Output:** one line per command.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <cctype>
#include <iostream>
#include <string>

std::string encode(const std::string& s) {
    std::string out;
    std::size_t i = 0;
    while (i < s.size()) {
        std::size_t j = i;
        while (j < s.size() && s[j] == s[i]) {
            ++j;                                   // s[i..j) is one run
        }
        out += s[i];
        if (j - i > 1) {
            out += std::to_string(j - i);
        }
        i = j;
    }
    return out;
}

std::string decode(const std::string& s) {
    std::string out;
    std::size_t i = 0;
    while (i < s.size()) {
        char c = s[i];
        ++i;
        std::size_t count = 0;
        while (i < s.size() && std::isdigit(static_cast<unsigned char>(s[i]))) {
            count = count * 10 + static_cast<std::size_t>(s[i] - '0');
            ++i;
        }
        out.append(count == 0 ? 1 : count, c);    // no number means a run of one
    }
    return out;
}

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::size_t space = line.find(' ');
        std::string command = line.substr(0, space);
        std::string text = space == std::string::npos ? "" : line.substr(space + 1);
        if (command == "encode") {
            std::cout << encode(text) << '\n';
        } else {
            std::cout << decode(text) << '\n';
        }
    }
}
```

```hint
Split each line at the first space with `find` and `substr`. Remember the line may have no space at all.
```

```hint
To encode, find the end `j` of the run that starts at `i` (the first position where `s[j] != s[i]`),
append the character and, if `j - i > 1`, `std::to_string(j - i)`. Then continue from `j`.
```

```hint
To decode, take one character, then read **all** the digits that follow it into a number
(`count = count * 10 + digit`). No digits means a count of 1. `out.append(count, c)` appends `count` copies.
```

```stdin
encode aaabccdddd
decode a3bc2d4
```

```expected
a3bc2d4
aaabccdddd
```

```stdin
encode Hello, World!!!
decode x10y
```

```expected
Hel2o, World!3
xxxxxxxxxxy
```

```stdin
encode
encode zzzzzzzzzzzz
decode a12b
encode aAaA
```

```expected hidden

z12
aaaaaaaaaaaab
aAaA
```

```stdin
encode a  b   c
decode  3x 2
encode xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxyz
decode q100!
```

```expected hidden
a 2b 3c
   x
x98yz
qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq!
```
:::

:::exercise Big number arithmetic {hard}
Built-in integers overflow: even `unsigned long long` stops at about 1.8 × 10^19. Implement addition and
subtraction for **arbitrarily large** non-negative integers stored as strings of digits, the way you
learned it at school: digit by digit from the right, with carries and borrows.

**Input:** two lines, each holding a non-negative integer `a` and `b` with 1 to 1000 digits. They may
have leading zeros (`007`).
**Output:** two lines: `a + b`, then `a - b`. Print them without leading zeros (zero is `0`), and with a
`-` sign if `a - b` is negative.

Example: `123` and `456` give `579` and `-333`.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <string>

std::string stripZeros(const std::string& s) {
    std::size_t i = 0;
    while (i + 1 < s.size() && s[i] == '0') {
        ++i;                                   // keep at least one digit
    }
    return s.substr(i);
}

std::string reversed(const std::string& s) {
    std::string r;
    for (std::size_t i = s.size(); i-- > 0;) {
        r += s[i];
    }
    return r;
}

// Compares two numbers without leading zeros: negative, zero or positive like strcmp.
int compare(const std::string& a, const std::string& b) {
    if (a.size() != b.size()) {
        return a.size() < b.size() ? -1 : 1;   // more digits means bigger
    }
    if (a == b) return 0;
    return a < b ? -1 : 1;                     // same length: dictionary order is numeric order
}

std::string add(const std::string& a, const std::string& b) {
    std::string digits;                        // built backwards, least significant first
    std::size_t i = a.size();
    std::size_t j = b.size();
    int carry = 0;
    while (i > 0 || j > 0 || carry > 0) {
        int sum = carry;
        if (i > 0) sum += a[--i] - '0';
        if (j > 0) sum += b[--j] - '0';
        digits += static_cast<char>('0' + sum % 10);
        carry = sum / 10;
    }
    return stripZeros(reversed(digits));
}

// Requires a >= b.
std::string subtract(const std::string& a, const std::string& b) {
    std::string digits;
    std::size_t i = a.size();
    std::size_t j = b.size();
    int borrow = 0;
    while (i > 0) {
        int d = (a[--i] - '0') - borrow;
        if (j > 0) d -= b[--j] - '0';
        if (d < 0) {
            d += 10;
            borrow = 1;
        } else {
            borrow = 0;
        }
        digits += static_cast<char>('0' + d);
    }
    return stripZeros(reversed(digits));
}

int main() {
    std::string a, b;
    std::cin >> a >> b;
    a = stripZeros(a);
    b = stripZeros(b);

    std::cout << add(a, b) << '\n';
    if (compare(a, b) >= 0) {
        std::cout << subtract(a, b) << '\n';
    } else {
        std::cout << '-' << subtract(b, a) << '\n';   // a - b = -(b - a)
    }
}
```

```hint
Walk both strings from their **last** character with two indexes. At each step add the two digits
(`c - '0'`) plus the carry; the new digit is `sum % 10` and the carry is `sum / 10`. Keep going while
either number has digits left **or** there is still a carry.
```

```hint
It's easiest to collect the result digits backwards and reverse at the end. Strip leading zeros from
the inputs first, and from the results at the end (but keep a single `0`).
```

```hint
For `a - b`, first decide which number is bigger: after stripping zeros, the longer one is bigger, and
for equal lengths plain string comparison works. Always subtract the smaller from the bigger (with a
borrow instead of a carry) and add the `-` sign yourself.
```

```stdin
123
456
```

```expected
579
-333
```

```stdin
999999999999999999999
1
```

```expected
1000000000000000000000
999999999999999999998
```

```stdin
0
0
```

```expected hidden
0
0
```

```stdin
0007
007
```

```expected hidden
14
0
```

```stdin
1
100000000000000000000
```

```expected hidden
100000000000000000001
-99999999999999999999
```

```stdin
1000
1
```

```expected hidden
1001
999
```

```stdin
123456789012345678901234567890123456789012345678901234567890
987654321098765432109876543210987654321098765432109876543210
```

```expected hidden
1111111110111111111011111111101111111110111111111011111111100
-864197532086419753208641975320864197532086419753208641975320
```
:::

:::exercise Anagram groups {hard}
Two words are **anagrams** if one is a rearrangement of the other's letters: `listen` and `silent`. Read
words and group the anagrams together. Do it with vectors and strings only (no `std::map` or
`std::sort`): for each word, compute a **signature** that is the same for all its anagrams, and look it
up in a vector of signatures you've seen so far.

**Input:** zero or more words of lowercase letters (`a` to `z`), separated by whitespace.
**Output:** one line per group, in the order the groups first appear in the input. Each line lists the
group's words in input order, separated by single spaces. Repeated words stay in the output. Nothing
at all if there are no words.

Example: `eat tea tan ate nat bat` gives `eat tea ate`, then `tan nat`, then `bat`.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

// The word's letters in alphabetical order, built by counting: "tea" -> "aet".
std::string signature(const std::string& word) {
    int counts[26]{};
    for (char c : word) {
        ++counts[c - 'a'];
    }
    std::string sig;
    for (int letter = 0; letter < 26; ++letter) {
        sig.append(static_cast<std::size_t>(counts[letter]), static_cast<char>('a' + letter));
    }
    return sig;
}

int main() {
    std::vector<std::string> signatures;              // signatures[g] belongs to groups[g]
    std::vector<std::vector<std::string>> groups;

    std::string word;
    while (std::cin >> word) {
        std::string sig = signature(word);
        std::size_t g = 0;
        while (g < signatures.size() && signatures[g] != sig) {
            ++g;
        }
        if (g == signatures.size()) {                 // a new group
            signatures.push_back(sig);
            groups.push_back({});
        }
        groups[g].push_back(word);
    }

    for (const auto& group : groups) {
        for (std::size_t i = 0; i < group.size(); ++i) {
            std::cout << group[i] << (i + 1 < group.size() ? " " : "\n");
        }
    }
}
```

```hint
A good signature is the word's letters sorted alphabetically: every anagram of `tea` has the signature
`aet`. You can build it without sorting: count each letter in an `int counts[26]{}` array, then append
each letter as many times as it was counted.
```

```hint
Keep two parallel vectors: `signatures` and `groups` (a `std::vector<std::vector<std::string>>`). For
each word, search `signatures` for its signature; if it's not there, start a new group.
```

```hint
Careful with "clever" signatures: the **sum** of the letter codes is not enough (`ad` and `bc` have the
same sum), and neither is the **set** of letters (`aab` and `abb`).
```

```stdin
eat tea tan ate nat bat
```

```expected
eat tea ate
tan nat
bat
```

```stdin
listen silent listen enlist inlets
```

```expected
listen silent listen enlist inlets
```

```stdin
```

```expected hidden
```

```stdin
aab abb ab ba
```

```expected hidden
aab
abb
ab ba
```

```stdin
ad bc da cb
a
```

```expected hidden
ad da
bc cb
a
```

```stdin
zzz
```

```expected hidden
zzz
```
:::

:::exercise Vigenere cipher {hard}
The **Vigenère cipher** is a Caesar cipher whose shift changes from letter to letter, following a
keyword. With the key `LEMON`, the first letter of the text is shifted by `L` (11, since `A`/`a` is 0),
the second by `E` (4), then `M`, `O`, `N`, and then the key starts over: `ATTACKATDAWN` encrypts to
`LXFOPVEFRNHR`. Decryption shifts backwards by the same amounts.

Rules: letters keep their case; key letters count the same in either case; **only letters** use up a
key letter (spaces, digits and punctuation are copied unchanged and don't advance the key); and the key
position **carries over** from one line of text to the next.

**Input:** a line `encrypt` or `decrypt`, a line with the key (1 to 100 letters), then zero or more lines
of text until the end of input.
**Output:** each line of text, encrypted or decrypted.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <cctype>
#include <iostream>
#include <string>

int main() {
    std::string mode, key;
    std::getline(std::cin, mode);
    std::getline(std::cin, key);
    int direction = (mode == "decrypt") ? -1 : 1;

    std::size_t k = 0;                         // position in the key, shared by all lines
    std::string line;
    while (std::getline(std::cin, line)) {
        for (char& c : line) {
            unsigned char uc = static_cast<unsigned char>(c);
            if (!std::isalpha(uc)) {
                continue;                      // non-letters don't use up a key letter
            }
            int shift = std::tolower(static_cast<unsigned char>(key[k])) - 'a';
            k = (k + 1) % key.size();
            char base = std::isupper(uc) ? 'A' : 'a';
            int index = (c - base + direction * shift + 26) % 26;
            c = static_cast<char>(base + index);
        }
        std::cout << line << '\n';
    }
}
```

```hint
Keep one index `k` into the key **outside** the loop over lines. Each time you transform a letter,
use `key[k]` and then advance `k`, wrapping with `% key.size()`.
```

```hint
The shift for a key letter is `std::tolower(key[k]) - 'a'`. For a letter `c` with base `'a'` or `'A'`,
the new index is `(c - base + shift) % 26` to encrypt, and `(c - base - shift + 26) % 26` to decrypt
(the `+ 26` keeps it from going negative).
```

```stdin
encrypt
LEMON
ATTACKATDAWN
```

```expected
LXFOPVEFRNHR
```

```stdin
decrypt
lemon
LXFOPVEFRNHR
```

```expected
ATTACKATDAWN
```

```stdin
encrypt
Key
Hello, World! 2024
```

```expected hidden
Rijvs, Uyvjn! 2024
```

```stdin
encrypt
abc
aa
aa

a a
```

```expected hidden
ab
ca

b c
```

```stdin
decrypt
KEY
Rijvs, Uyvjn! 2024
```

```expected hidden
Hello, World! 2024
```

```stdin
encrypt
z
abc XYZ
```

```expected hidden
zab WXY
```
:::

:::exercise Longest unique window {hard}
Find the longest **substring** (a contiguous piece) of a line in which no character appears twice. If
several have the same maximum length, report the leftmost one. Every character counts, including
spaces and punctuation.

For `abcabcbb` it's `abc`; for `pwwkew` it's `wke` (not `pwke`, which isn't contiguous).

Checking every substring is far too slow for long lines. Use a **sliding window**: grow the window to the
right one character at a time, and when the new character is already inside the window, move the
window's left edge just past its previous occurrence. An array `int lastSeen[256]` remembering the last
index of every character makes that check instant.

**Input:** one line of up to 100000 characters (it may be empty).
**Output:** `<length> [<substring>]`, for example `3 [abc]` (or `0 []` for an empty line).

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);

    int lastSeen[256];
    for (int& x : lastSeen) {
        x = -1;                                  // not seen yet
    }

    int start = 0;                               // the window is line[start..i]
    int bestStart = 0;
    int bestLength = 0;
    for (int i = 0; i < static_cast<int>(line.size()); ++i) {
        unsigned char c = static_cast<unsigned char>(line[i]);
        if (lastSeen[c] >= start) {
            start = lastSeen[c] + 1;             // jump past the earlier copy
        }
        lastSeen[c] = i;
        if (i - start + 1 > bestLength) {        // strictly longer: keeps the leftmost
            bestLength = i - start + 1;
            bestStart = start;
        }
    }
    std::cout << bestLength << " [" << line.substr(bestStart, bestLength) << "]\n";
}
```

```hint
Index `lastSeen` with `static_cast<unsigned char>(c)`, so every byte maps to 0..255 (a plain `char` can
be negative).
```

```hint
Only move the left edge **forward**. In `abba`, when you reach the last `a`, its previous occurrence
(index 0) is already outside the window `[2..2]`, so the window must not jump back to index 1. That's
why the condition is `lastSeen[c] >= start`.
```

```hint
Update the best answer only when the window is **strictly** longer, so ties keep the leftmost window.
```

```stdin
abcabcbb
```

```expected
3 [abc]
```

```stdin
pwwkew
```

```expected
3 [wke]
```

```stdin
```

```expected hidden
0 []
```

```stdin
abba
```

```expected hidden
2 [ab]
```

```stdin
bbbbb
```

```expected hidden
1 [b]
```

```stdin
dvdf
```

```expected hidden
3 [vdf]
```

```stdin
a b c a, d!
```

```expected hidden
5 [a, d!]
```
:::
