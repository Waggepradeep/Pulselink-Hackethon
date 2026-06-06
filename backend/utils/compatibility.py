# backend/utils/compatibility.py

COMPATIBILITY_RULES = {
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"]
}

def get_compatible_blood_groups(recipient_group: str) -> list[str]:
    """
    Given a recipient's blood group (e.g. 'A+', 'O-'), returns a list of donor 
    blood groups that are compatible.
    """
    # Clean the input (e.g. remove spaces, handle case-insensitivity)
    cleaned_group = recipient_group.strip().upper()
    
    # Handle verbal formats in case they are passed
    verbal_mapping = {
        "A POSITIVE": "A+", "A NEGATIVE": "A-",
        "B POSITIVE": "B+", "B NEGATIVE": "B-",
        "AB POSITIVE": "AB+", "AB NEGATIVE": "AB-",
        "O POSITIVE": "O+", "O NEGATIVE": "O-"
    }
    
    if cleaned_group in verbal_mapping:
        cleaned_group = verbal_mapping[cleaned_group]
        
    return COMPATIBILITY_RULES.get(cleaned_group, [])
