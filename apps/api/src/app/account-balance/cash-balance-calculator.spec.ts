import { calculateCashBalances } from './cash-balance-calculator';

type CalculatorInput = Parameters<typeof calculateCashBalances>[0];

function summarize(result: ReturnType<typeof calculateCashBalances>) {
  return {
    balances: result.balances.map(({ date, value }) => {
      return { date, value: value.toString() };
    }),
    minimumBalance: {
      ...result.minimumBalance,
      value: result.minimumBalance.value.toString()
    }
  };
}

describe('Cash balance calculator', () => {
  it('Returns only the opening balance when there are no events', () => {
    const result = calculateCashBalances({
      openingBalance: { balance: '500', date: '2026-10-01', sequence: 7 },
      events: []
    });

    expect(summarize(result)).toEqual({
      balances: [{ date: '2026-10-01', value: '500' }],
      minimumBalance: { date: '2026-10-01', sequence: 7, value: '500' }
    });
  });

  it('Counts two separate deposits of 400 without filling empty days', () => {
    const result = calculateCashBalances({
      openingBalance: { balance: '0', date: '2026-10-01', sequence: 0 },
      events: [
        { amount: '400', date: '2026-10-03', sequence: 0, type: 'MOVEMENT' },
        { amount: '400', date: '2026-10-05', sequence: 0, type: 'MOVEMENT' }
      ]
    });

    expect(summarize(result)).toEqual({
      balances: [
        { date: '2026-10-01', value: '0' },
        { date: '2026-10-03', value: '400' },
        { date: '2026-10-05', value: '800' }
      ],
      minimumBalance: { date: '2026-10-01', sequence: 0, value: '0' }
    });
  });

  it('Produces one closing balance for a same-day deposit and withdrawal', () => {
    const result = calculateCashBalances({
      openingBalance: { balance: '100', date: '2026-10-01', sequence: 0 },
      events: [
        { amount: '400', date: '2026-10-01', sequence: 10, type: 'MOVEMENT' },
        { amount: '-150', date: '2026-10-01', sequence: 20, type: 'MOVEMENT' }
      ]
    });

    expect(summarize(result)).toEqual({
      balances: [{ date: '2026-10-01', value: '350' }],
      minimumBalance: { date: '2026-10-01', sequence: 0, value: '100' }
    });
  });

  it('Starts from an explicit intraday opening and permits sparse sequences', () => {
    const result = calculateCashBalances({
      openingBalance: { balance: '500', date: '2026-10-10', sequence: 30 },
      events: [
        { amount: '-50', date: '2026-10-10', sequence: 80, type: 'MOVEMENT' },
        { amount: '100', date: '2026-10-11', sequence: 0, type: 'MOVEMENT' }
      ]
    });

    expect(summarize(result)).toEqual({
      balances: [
        { date: '2026-10-10', value: '450' },
        { date: '2026-10-11', value: '550' }
      ],
      minimumBalance: { date: '2026-10-10', sequence: 80, value: '450' }
    });
  });

  it('Applies a same-day checkpoint between the preceding and following movements', () => {
    const result = calculateCashBalances({
      openingBalance: { balance: '100', date: '2026-10-01', sequence: 0 },
      events: [
        { amount: '50', date: '2026-10-01', sequence: 10, type: 'MOVEMENT' },
        { balance: '80', date: '2026-10-01', sequence: 20, type: 'CHECKPOINT' },
        { amount: '-20', date: '2026-10-01', sequence: 30, type: 'MOVEMENT' }
      ]
    });

    expect(summarize(result)).toEqual({
      balances: [{ date: '2026-10-01', value: '60' }],
      minimumBalance: { date: '2026-10-01', sequence: 30, value: '60' }
    });
  });

  it('Propagates a backdated deposit only until the next absolute checkpoint', () => {
    const openingBalance = {
      balance: '1000',
      date: '2026-10-01',
      sequence: 0
    };
    const events: CalculatorInput['events'] = [
      { amount: '-300', date: '2026-10-02', sequence: 0, type: 'MOVEMENT' },
      { balance: '900', date: '2026-10-04', sequence: 0, type: 'CHECKPOINT' },
      { amount: '-100', date: '2026-10-05', sequence: 0, type: 'MOVEMENT' }
    ];

    const original = summarize(
      calculateCashBalances({ openingBalance, events })
    );
    const revised = summarize(
      calculateCashBalances({
        openingBalance,
        events: [
          ...events,
          { amount: '200', date: '2026-10-03', sequence: 0, type: 'MOVEMENT' }
        ]
      })
    );

    expect(original.balances).toEqual([
      { date: '2026-10-01', value: '1000' },
      { date: '2026-10-02', value: '700' },
      { date: '2026-10-04', value: '900' },
      { date: '2026-10-05', value: '800' }
    ]);
    expect(revised.balances).toEqual([
      { date: '2026-10-01', value: '1000' },
      { date: '2026-10-02', value: '700' },
      { date: '2026-10-03', value: '900' },
      { date: '2026-10-04', value: '900' },
      { date: '2026-10-05', value: '800' }
    ]);
  });

  it('Recalculates after a movement amount is changed or the movement is removed', () => {
    const openingBalance = {
      balance: '0',
      date: '2026-10-01',
      sequence: 0
    };
    const withdrawal: CalculatorInput['events'][number] = {
      amount: '-150',
      date: '2026-10-03',
      sequence: 0,
      type: 'MOVEMENT'
    };

    const original = summarize(
      calculateCashBalances({
        openingBalance,
        events: [
          { amount: '400', date: '2026-10-02', sequence: 0, type: 'MOVEMENT' },
          withdrawal
        ]
      })
    );
    const changed = summarize(
      calculateCashBalances({
        openingBalance,
        events: [
          { amount: '600', date: '2026-10-02', sequence: 0, type: 'MOVEMENT' },
          withdrawal
        ]
      })
    );
    const removed = summarize(
      calculateCashBalances({ openingBalance, events: [withdrawal] })
    );

    expect(original.balances).toEqual([
      { date: '2026-10-01', value: '0' },
      { date: '2026-10-02', value: '400' },
      { date: '2026-10-03', value: '250' }
    ]);
    expect(changed.balances).toEqual([
      { date: '2026-10-01', value: '0' },
      { date: '2026-10-02', value: '600' },
      { date: '2026-10-03', value: '450' }
    ]);
    expect(removed).toEqual({
      balances: [
        { date: '2026-10-01', value: '0' },
        { date: '2026-10-03', value: '-150' }
      ],
      minimumBalance: { date: '2026-10-03', sequence: 0, value: '-150' }
    });
  });

  it('Changes the final balance when a deposit is moved beyond a checkpoint', () => {
    const openingBalance = {
      balance: '0',
      date: '2026-10-01',
      sequence: 0
    };
    const followingEvents: CalculatorInput['events'] = [
      { balance: '1000', date: '2026-10-03', sequence: 0, type: 'CHECKPOINT' },
      { amount: '-100', date: '2026-10-04', sequence: 0, type: 'MOVEMENT' }
    ];

    const original = summarize(
      calculateCashBalances({
        openingBalance,
        events: [
          { amount: '400', date: '2026-10-02', sequence: 0, type: 'MOVEMENT' },
          ...followingEvents
        ]
      })
    );
    const moved = summarize(
      calculateCashBalances({
        openingBalance,
        events: [
          ...followingEvents,
          { amount: '400', date: '2026-10-04', sequence: 10, type: 'MOVEMENT' }
        ]
      })
    );

    expect(original.balances).toEqual([
      { date: '2026-10-01', value: '0' },
      { date: '2026-10-02', value: '400' },
      { date: '2026-10-03', value: '1000' },
      { date: '2026-10-04', value: '900' }
    ]);
    expect(moved.balances).toEqual([
      { date: '2026-10-01', value: '0' },
      { date: '2026-10-03', value: '1000' },
      { date: '2026-10-04', value: '1300' }
    ]);
  });

  it('Recalculates the affected segment when a checkpoint changes or is removed', () => {
    const openingBalance = {
      balance: '0',
      date: '2026-10-01',
      sequence: 0
    };
    const movements: CalculatorInput['events'] = [
      { amount: '400', date: '2026-10-02', sequence: 0, type: 'MOVEMENT' },
      { amount: '-100', date: '2026-10-04', sequence: 0, type: 'MOVEMENT' }
    ];

    const changed = summarize(
      calculateCashBalances({
        openingBalance,
        events: [
          ...movements,
          {
            balance: '800',
            date: '2026-10-03',
            sequence: 0,
            type: 'CHECKPOINT'
          }
        ]
      })
    );
    const removed = summarize(
      calculateCashBalances({ openingBalance, events: movements })
    );

    expect(changed.balances).toEqual([
      { date: '2026-10-01', value: '0' },
      { date: '2026-10-02', value: '400' },
      { date: '2026-10-03', value: '800' },
      { date: '2026-10-04', value: '700' }
    ]);
    expect(removed.balances).toEqual([
      { date: '2026-10-01', value: '0' },
      { date: '2026-10-02', value: '400' },
      { date: '2026-10-04', value: '300' }
    ]);
  });

  it('Reports an intraday deficit even when the closing balance is positive', () => {
    const result = calculateCashBalances({
      openingBalance: { balance: '50', date: '2026-10-01', sequence: 0 },
      events: [
        { amount: '-100', date: '2026-10-01', sequence: 10, type: 'MOVEMENT' },
        { amount: '200', date: '2026-10-01', sequence: 20, type: 'MOVEMENT' }
      ]
    });

    expect(summarize(result)).toEqual({
      balances: [{ date: '2026-10-01', value: '150' }],
      minimumBalance: { date: '2026-10-01', sequence: 10, value: '-50' }
    });
  });

  it('Keeps a preceding deficit in the minimum after a checkpoint resets the balance', () => {
    const result = calculateCashBalances({
      openingBalance: { balance: '50', date: '2026-10-01', sequence: 0 },
      events: [
        { amount: '-100', date: '2026-10-02', sequence: 0, type: 'MOVEMENT' },
        { balance: '100', date: '2026-10-03', sequence: 0, type: 'CHECKPOINT' }
      ]
    });

    expect(summarize(result)).toEqual({
      balances: [
        { date: '2026-10-01', value: '50' },
        { date: '2026-10-02', value: '-50' },
        { date: '2026-10-03', value: '100' }
      ],
      minimumBalance: { date: '2026-10-02', sequence: 0, value: '-50' }
    });
  });

  it('Accepts negative openings and checkpoints and includes both in the minimum', () => {
    const openingBalance = {
      balance: '-50',
      date: '2026-10-01',
      sequence: 0
    };
    const openingOnly = calculateCashBalances({ openingBalance, events: [] });
    const result = calculateCashBalances({
      openingBalance,
      events: [
        { amount: '75', date: '2026-10-02', sequence: 0, type: 'MOVEMENT' },
        { balance: '-100', date: '2026-10-03', sequence: 0, type: 'CHECKPOINT' }
      ]
    });

    expect(summarize(openingOnly).minimumBalance).toEqual({
      date: '2026-10-01',
      sequence: 0,
      value: '-50'
    });
    expect(summarize(result)).toEqual({
      balances: [
        { date: '2026-10-01', value: '-50' },
        { date: '2026-10-02', value: '25' },
        { date: '2026-10-03', value: '-100' }
      ],
      minimumBalance: { date: '2026-10-03', sequence: 0, value: '-100' }
    });
  });

  it('Retains the first chronological position when the minimum is reached again', () => {
    const result = calculateCashBalances({
      openingBalance: { balance: '100', date: '2026-10-01', sequence: 0 },
      events: [
        { amount: '-50', date: '2026-10-02', sequence: 0, type: 'MOVEMENT' },
        { amount: '100', date: '2026-10-03', sequence: 0, type: 'MOVEMENT' },
        { balance: '50', date: '2026-10-04', sequence: 0, type: 'CHECKPOINT' }
      ]
    });

    expect(summarize(result).minimumBalance).toEqual({
      date: '2026-10-02',
      sequence: 0,
      value: '50'
    });
  });

  it('Adds decimal amounts exactly and returns to zero without a residual', () => {
    const result = calculateCashBalances({
      openingBalance: { balance: '0.1', date: '2026-10-01', sequence: 0 },
      events: [
        { amount: '0.2', date: '2026-10-02', sequence: 0, type: 'MOVEMENT' },
        { amount: '-0.3', date: '2026-10-03', sequence: 0, type: 'MOVEMENT' }
      ]
    });

    expect(summarize(result)).toEqual({
      balances: [
        { date: '2026-10-01', value: '0.1' },
        { date: '2026-10-02', value: '0.3' },
        { date: '2026-10-03', value: '0' }
      ],
      minimumBalance: { date: '2026-10-03', sequence: 0, value: '0' }
    });
  });

  it('Preserves decimal amounts beyond the safe integer range of number', () => {
    const result = calculateCashBalances({
      openingBalance: {
        balance: '9007199254740993.01',
        date: '2026-10-01',
        sequence: 0
      },
      events: [
        { amount: '0.02', date: '2026-10-02', sequence: 0, type: 'MOVEMENT' }
      ]
    });

    expect(summarize(result).balances).toEqual([
      { date: '2026-10-01', value: '9007199254740993.01' },
      { date: '2026-10-02', value: '9007199254740993.03' }
    ]);
  });

  it('Keeps dates with a zero movement or an unchanged checkpoint', () => {
    const result = calculateCashBalances({
      openingBalance: { balance: '50', date: '2026-10-01', sequence: 0 },
      events: [
        { amount: '0', date: '2026-10-03', sequence: 0, type: 'MOVEMENT' },
        { balance: '50', date: '2026-10-05', sequence: 0, type: 'CHECKPOINT' }
      ]
    });

    expect(summarize(result)).toEqual({
      balances: [
        { date: '2026-10-01', value: '50' },
        { date: '2026-10-03', value: '50' },
        { date: '2026-10-05', value: '50' }
      ],
      minimumBalance: { date: '2026-10-01', sequence: 0, value: '50' }
    });
  });

  it('Orders a frozen input without mutating it and remains deterministic', () => {
    const input: CalculatorInput = Object.freeze({
      openingBalance: Object.freeze({
        balance: '100',
        date: '2026-10-01',
        sequence: 0
      }),
      events: Object.freeze([
        Object.freeze({
          amount: '-20',
          date: '2026-10-02',
          sequence: 30,
          type: 'MOVEMENT' as const
        }),
        Object.freeze({
          balance: '80',
          date: '2026-10-02',
          sequence: 20,
          type: 'CHECKPOINT' as const
        }),
        Object.freeze({
          amount: '50',
          date: '2026-10-02',
          sequence: 10,
          type: 'MOVEMENT' as const
        })
      ])
    });
    const originalInput = JSON.stringify(input);
    const result = summarize(calculateCashBalances(input));

    expect(result).toEqual({
      balances: [
        { date: '2026-10-01', value: '100' },
        { date: '2026-10-02', value: '60' }
      ],
      minimumBalance: { date: '2026-10-02', sequence: 30, value: '60' }
    });
    expect(JSON.stringify(input)).toEqual(originalInput);
    expect(summarize(calculateCashBalances(input))).toEqual(result);
  });

  it.each(['2000', '2024'])('Accepts the leap day of %s', (year) => {
    const result = calculateCashBalances({
      openingBalance: { balance: '100', date: `${year}-02-28`, sequence: 0 },
      events: [
        { amount: '20', date: `${year}-02-29`, sequence: 0, type: 'MOVEMENT' },
        { amount: '-5', date: `${year}-03-01`, sequence: 0, type: 'MOVEMENT' }
      ]
    });

    expect(summarize(result).balances).toEqual([
      { date: `${year}-02-28`, value: '100' },
      { date: `${year}-02-29`, value: '120' },
      { date: `${year}-03-01`, value: '115' }
    ]);
  });

  it('Preserves civil dates across a daylight-saving transition', () => {
    const result = calculateCashBalances({
      openingBalance: { balance: '100', date: '2026-10-24', sequence: 0 },
      events: [
        { amount: '20', date: '2026-10-25', sequence: 0, type: 'MOVEMENT' },
        { amount: '-5', date: '2026-10-26', sequence: 0, type: 'MOVEMENT' }
      ]
    });

    expect(summarize(result).balances).toEqual([
      { date: '2026-10-24', value: '100' },
      { date: '2026-10-25', value: '120' },
      { date: '2026-10-26', value: '115' }
    ]);
  });

  describe('Input validation', () => {
    it.each([
      '',
      '2026-2-03',
      '2026-02-30',
      '2023-02-29',
      '1900-02-29',
      '2026-04-31',
      '2026-00-01',
      '2026-13-01',
      '2026-10-00',
      '2026-10-20T00:00:00Z',
      '2026-10-20T00:00:00+02:00'
    ])('Rejects invalid civil date %s in an opening or event', (date) => {
      expect(() => {
        calculateCashBalances({
          openingBalance: { balance: '0', date, sequence: 0 },
          events: []
        });
      }).toThrow();
      expect(() => {
        calculateCashBalances({
          openingBalance: { balance: '0', date: '1800-01-01', sequence: 0 },
          events: [{ amount: '1', date, sequence: 0, type: 'MOVEMENT' }]
        });
      }).toThrow();
    });

    it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 9007199254740992])(
      'Rejects invalid sequence %s in an opening or event',
      (sequence) => {
        expect(() => {
          calculateCashBalances({
            openingBalance: { balance: '0', date: '2026-10-01', sequence },
            events: []
          });
        }).toThrow();
        expect(() => {
          calculateCashBalances({
            openingBalance: { balance: '0', date: '2026-10-01', sequence: 0 },
            events: [
              { amount: '1', date: '2026-10-02', sequence, type: 'MOVEMENT' }
            ]
          });
        }).toThrow();
      }
    );

    it.each([
      { date: '2026-10-09', sequence: 100 },
      { date: '2026-10-10', sequence: 9 },
      { date: '2026-10-10', sequence: 10 }
    ])(
      'Rejects an event at or before the opening: $date, $sequence',
      (position) => {
        expect(() => {
          calculateCashBalances({
            openingBalance: {
              balance: '500',
              date: '2026-10-10',
              sequence: 10
            },
            events: [{ ...position, amount: '400', type: 'MOVEMENT' }]
          });
        }).toThrow();
      }
    );

    it('Rejects a movement and checkpoint at the same position', () => {
      expect(() => {
        calculateCashBalances({
          openingBalance: { balance: '0', date: '2026-10-01', sequence: 0 },
          events: [
            {
              amount: '400',
              date: '2026-10-02',
              sequence: 10,
              type: 'MOVEMENT'
            },
            {
              balance: '80',
              date: '2026-10-02',
              sequence: 10,
              type: 'CHECKPOINT'
            }
          ]
        });
      }).toThrow();
    });

    it.each(['', 'not-a-number', 'NaN', 'Infinity', '--1', '0x10', '1,000'])(
      'Rejects invalid decimal %s in each kind of balance input',
      (value) => {
        expect(() => {
          calculateCashBalances({
            openingBalance: { balance: value, date: '2026-10-01', sequence: 0 },
            events: []
          });
        }).toThrow();

        const events: CalculatorInput['events'] = [
          { amount: value, date: '2026-10-02', sequence: 0, type: 'MOVEMENT' },
          {
            balance: value,
            date: '2026-10-02',
            sequence: 0,
            type: 'CHECKPOINT'
          }
        ];

        for (const event of events) {
          expect(() => {
            calculateCashBalances({
              openingBalance: { balance: '0', date: '2026-10-01', sequence: 0 },
              events: [event]
            });
          }).toThrow();
        }
      }
    );

    it('Rejects number amounts instead of silently accepting floating-point inputs', () => {
      const value = 0.2 as unknown as string;

      expect(() => {
        calculateCashBalances({
          openingBalance: { balance: value, date: '2026-10-01', sequence: 0 },
          events: []
        });
      }).toThrow();

      const events: CalculatorInput['events'] = [
        { amount: value, date: '2026-10-02', sequence: 0, type: 'MOVEMENT' },
        { balance: value, date: '2026-10-02', sequence: 0, type: 'CHECKPOINT' }
      ];

      for (const event of events) {
        expect(() => {
          calculateCashBalances({
            openingBalance: { balance: '0', date: '2026-10-01', sequence: 0 },
            events: [event]
          });
        }).toThrow();
      }
    });
  });
});
