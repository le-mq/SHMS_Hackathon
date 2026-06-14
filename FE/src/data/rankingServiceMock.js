import mockData from './db.json';
const delay = (ms = 500) =>
    new Promise(resolve =>
        setTimeout(resolve, ms)
    );
// GET contests
export const getContests = async () => {
    await delay();
    return mockData.contests;
};
// GET contest by id
export const getContestById =
    async (id) => {
        await delay();
        return mockData.contests.find(
            c => c.id === Number(id)
        );
    };
// GET readiness
export const getReadiness =
    async (
        contestId, roundName
    ) => {
        await delay();
        return mockData.readiness;
    };
// POST process ranking
export const processRanking =
    async (
        contestId, round, topN
    ) => {
        await delay(1000);
        return {
            ...mockData.process,
            qualifiedCount:
                topN,
            eliminatedCount:
                mockData.process.results.length
                - topN,
            results:
                mockData.process.results
                    .map(team => ({
                        ...team,
                        status: team.rank <= topN ? "QUALIFIED" : "ELIMINATED"
                    }))
        };
    };
// POST publish
export const publishRanking =
    async (
        contestId, round, topN
    ) => {
        await delay();
        return {
            success: true,
            message:
                "Leaderboard published successfully"
        };
    };
// GET leaderboards
export const getLeaderboards =
    async () => {
        await delay();
        return mockData.leaderboards;
    };