'use client';

import React from 'react';
import useKanjiStore, {
  type IKanjiObj
} from '@/features/Kanji/store/useKanjiStore';
import useStatsStore from '@/features/Progress/store/useStatsStore';
import TimedChallenge, {
  type TimedChallengeConfig
} from '@/shared/components/TimedChallenge';
import { Random } from 'random-js';

const random = new Random();

export default function TimedChallengeKanji() {
  const selectedKanjiObjs = useKanjiStore(state => state.selectedKanjiObjs);

  const {
    timedKanjiCorrectAnswers,
    timedKanjiWrongAnswers,
    timedKanjiStreak,
    timedKanjiBestStreak,
    incrementTimedKanjiCorrectAnswers,
    incrementTimedKanjiWrongAnswers,
    resetTimedKanjiStats
  } = useStatsStore();

  const config: TimedChallengeConfig<IKanjiObj> = {
    dojoType: 'kanji',
    dojoLabel: 'Kanji',
    localStorageKey: 'timedKanjiChallengeDuration',
    goalTimerContext: 'Kanji Timed Challenge',
    items: selectedKanjiObjs,
    generateQuestion: items => items[random.integer(0, items.length - 1)],
    renderQuestion: question => question.kanjiChar,
    getAudioText: question => question.kanjiChar,
    inputPlaceholder: 'Type the meaning...',
    modeDescription: 'Mode: Input (See kanji → Type meaning)',
    checkAnswer: (question, answer) =>
      question.meanings.some(
        meaning => answer.toLowerCase() === meaning.toLowerCase()
      ),
    getCorrectAnswer: question => question.meanings[0],
    stats: {
      correct: timedKanjiCorrectAnswers,
      wrong: timedKanjiWrongAnswers,
      streak: timedKanjiStreak,
      bestStreak: timedKanjiBestStreak,
      incrementCorrect: incrementTimedKanjiCorrectAnswers,
      incrementWrong: incrementTimedKanjiWrongAnswers,
      reset: resetTimedKanjiStats
    }
  };

  return <TimedChallenge config={config} />;
}
