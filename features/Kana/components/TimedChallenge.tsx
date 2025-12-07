'use client';

import React from 'react';
import useKanaStore from '@/features/Kana/store/useKanaStore';
import useStatsStore from '@/features/Progress/store/useStatsStore';
import { generateKanaQuestion } from '@/features/Kana/lib/generateKanaQuestions';
import type { KanaCharacter } from '@/features/Kana/lib/generateKanaQuestions';
import { flattenKanaGroups } from '@/features/Kana/lib/flattenKanaGroup';
import TimedChallenge, {
  type TimedChallengeConfig
} from '@/shared/components/TimedChallenge';

export default function TimedChallengeKana() {
  const kanaGroupIndices = useKanaStore(state => state.kanaGroupIndices);

  const selectedKana = React.useMemo(
    () => flattenKanaGroups(kanaGroupIndices) as unknown as KanaCharacter[],
    [kanaGroupIndices]
  );

  const {
    timedCorrectAnswers,
    timedWrongAnswers,
    timedStreak,
    timedBestStreak,
    incrementTimedCorrectAnswers,
    incrementTimedWrongAnswers,
    resetTimedStats
  } = useStatsStore();

  const config: TimedChallengeConfig<KanaCharacter> = {
    dojoType: 'kana',
    dojoLabel: 'Kana',
    localStorageKey: 'timedChallengeDuration',
    goalTimerContext: 'Kana Timed Challenge',
    items: selectedKana,
    generateQuestion: items => generateKanaQuestion(items),
    renderQuestion: question => question.kana,
    getAudioText: question => question.kana,
    inputPlaceholder: 'Type the romaji...',
    modeDescription: 'Mode: Input (See kana → Type romaji)',
    checkAnswer: (question, answer) =>
      answer.toLowerCase() === question.romaji.toLowerCase(),
    getCorrectAnswer: question => question.romaji,
    stats: {
      correct: timedCorrectAnswers,
      wrong: timedWrongAnswers,
      streak: timedStreak,
      bestStreak: timedBestStreak,
      incrementCorrect: incrementTimedCorrectAnswers,
      incrementWrong: incrementTimedWrongAnswers,
      reset: resetTimedStats
    }
  };

  return <TimedChallenge config={config} />;
}
