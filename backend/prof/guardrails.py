import re
from typing import Union

from agno.exceptions import CheckTrigger, InputCheckError
from agno.guardrails import BaseGuardrail, PromptInjectionGuardrail
from agno.run.agent import RunInput
from agno.run.team import TeamRunInput

from prof.config import EMERGENCY_EXTENSION

RunInputType = Union[RunInput, TeamRunInput]

EMERGENCY_PATTERNS = re.compile(
    r"\b(caught in|got caught|is caught|are caught|trapped|pinned|crushed|injured|injury|bleeding|unconscious|"
    r"not breathing|electrocuted|amputat\w*|severed|on fire|fire|spill\w*|burned|burnt|collapsed)\b",
    re.IGNORECASE,
)
BYPASS_VERBS = r"(bridge|bridging|bypass|bypassing|defeat|defeating|override|overriding|disable|disabling|jump|jumper|cheat)"
BYPASS_TARGETS = r"(light curtain|guard|interlock|safety (?:gate|switch|relay|circuit)|e-?stop|two-hand)"
BYPASS_PATTERN = re.compile(rf"\b{BYPASS_VERBS}\b.{{0,40}}{BYPASS_TARGETS}|{BYPASS_TARGETS}.{{0,40}}\b{BYPASS_VERBS}\b", re.IGNORECASE)

EMERGENCY_MESSAGE = (
    f"This sounds like an emergency. Press the nearest emergency stop (red E-stop) now, then call the plant emergency line on "
    f"extension {EMERGENCY_EXTENSION} and give your line and station number. Stay with the person, do not restart "
    f"or reverse the machine, and do not remove guards unless responders direct you. "
    f"Procedure: SAF-001 section 3 (Person caught in a machine). For a fire, sound the alarm and evacuate; "
    f"for a chemical splash, go to the nearest eyewash or shower (SAF-001 section 5, SAF-005)."
)
BYPASS_MESSAGE = (
    "I can't help with bridging, bypassing or defeating a safety device such as a light curtain, guard or interlock. "
    "If a device is faulty or slowing the line, stop the machine, tag it out and call maintenance on call. "
    "See SAF-003 section 5 (Bridging and bypassing prohibited) and SAF-003 section 4 (Damaged or missing guards)."
)


class EmergencyGuardrail(BaseGuardrail):
    name = "emergency_language"

    def check(self, run_input: RunInputType) -> None:
        match = EMERGENCY_PATTERNS.search(run_input.input_content_string())
        if match:
            raise InputCheckError(
                EMERGENCY_MESSAGE,
                check_trigger=CheckTrigger.INPUT_NOT_ALLOWED,
                additional_data={"guardrail": self.name, "detail": f"matched '{match.group(0)}'"},
            )

    async def async_check(self, run_input: RunInputType) -> None:
        self.check(run_input)


class SafetyBypassGuardrail(BaseGuardrail):
    name = "safety_bypass"

    def check(self, run_input: RunInputType) -> None:
        match = BYPASS_PATTERN.search(run_input.input_content_string())
        if match:
            raise InputCheckError(
                BYPASS_MESSAGE,
                check_trigger=CheckTrigger.INPUT_NOT_ALLOWED,
                additional_data={"guardrail": self.name, "detail": f"matched '{match.group(0)}'"},
            )

    async def async_check(self, run_input: RunInputType) -> None:
        self.check(run_input)


class InjectionGuardrail(PromptInjectionGuardrail):
    name = "prompt_injection"


GUARDRAILS: list[BaseGuardrail] = [EmergencyGuardrail(), SafetyBypassGuardrail(), InjectionGuardrail()]
GUARDRAIL_NAMES = [g.name for g in GUARDRAILS]  # type: ignore[attr-defined]
