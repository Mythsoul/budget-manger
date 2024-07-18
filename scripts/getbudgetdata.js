async function getbudgetdata(total_income , total_expenses , net_balance , current_savings , created_at) {
    const {total_income , total_expenses , net_balance , current_savings , created_at} = req.body;
    console.log("Total Income : " + total_income  + "\n" + "Total_expenses : " + total_expenses + "\n" + "net_balance : " + net_balance + "\n" + "current_savings : " + current_savings + "\n" + "created_at : " + created_at);

    try {

    } catch (err) {

    }
}


export {getbudgetdata}