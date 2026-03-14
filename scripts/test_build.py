import sys, os
sys.path.insert(0, os.path.dirname(__file__))

def test_normalize_known_alias():
    from build_data import normalize_character, ALIAS_MAP
    assert normalize_character("BUFFY", ALIAS_MAP) == "Buffy"

def test_normalize_case_insensitive():
    from build_data import normalize_character, ALIAS_MAP
    assert normalize_character("buffy summers", ALIAS_MAP) == "Buffy"

def test_normalize_unknown_returns_raw():
    from build_data import normalize_character, ALIAS_MAP
    assert normalize_character("Master", ALIAS_MAP) == "Master"

def test_normalize_empty_returns_empty():
    from build_data import normalize_character, ALIAS_MAP
    assert normalize_character("", ALIAS_MAP) == ""

if __name__ == "__main__":
    import traceback, sys
    tests = [test_normalize_known_alias, test_normalize_case_insensitive,
             test_normalize_unknown_returns_raw, test_normalize_empty_returns_empty]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
        except Exception as e:
            print(f"  FAIL  {t.__name__}: {e}")
            failed += 1
    sys.exit(failed)
