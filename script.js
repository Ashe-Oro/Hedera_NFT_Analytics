



   const form = document.getElementById("balances-form");
   const balancesTableBody = document.querySelector("#balances-table tbody");
   const holdersTableBody = document.querySelector("#holders-table tbody");
   let tokenCountsTableBody = document.querySelector("#token-counts-table tbody");
   tokenCountsTableBody.innerHTML = "";
   const countsTableBody = document.querySelector("#counts-table tbody");
   countsTableBody.innerHTML = "";
   document.getElementById("total-transactions").value = "";


   form.addEventListener("submit", async (event) => {
     event.preventDefault();
     balancesTableBody.innerHTML = "";
     holdersTableBody.innerHTML = "";
     tokenCountsTableBody.innerHTML = ""; // clear the token counts table body
     countsTableBody.innerHTML = "";
     document.getElementById("total-transactions").value = "";


     const greaterThanBalanceInput = form.elements["greater-than-balance"];
     var greaterThanBalance = greaterThanBalanceInput.value;
     greaterThanBalance;

     //console.log('GreaterThanBalance: ' + greaterThanBalance);

     const tokenIdsInput = form.elements["tokenIds"];

     const tokenIds = tokenIdsInput.value.split("\n").map(id => id.trim()).filter(id => id);
     tokenCountsTableBody = document.querySelector("#token-counts-table tbody");

      // Assuming the first token ID is used for getting transactions
      
     if (tokenIds.length > 0) {
       const totalTransactions = await getTransactions(tokenIds);
       console.log('Total Transactions: ' + totalTransactions);
   document.getElementById("total-transactions").value = totalTransactions;
 
 }

     try {

       const { balances, accountsWithAllTokens, tokenCounts } = await getBalances(greaterThanBalance, tokenIds);

       
               balances.forEach(balance => {
                 // Display the balances in the new table
                 const row = document.createElement("tr");
                 const tokenIdCell = document.createElement("td");
                 tokenIdCell.textContent = balance.tokenId;
                 const accountCell = document.createElement("td");
                 accountCell.textContent = balance.account;
                 const balanceCell = document.createElement("td");
                 balanceCell.textContent = balance.balance;
                 row.appendChild(tokenIdCell);
                 row.appendChild(accountCell);
                 row.appendChild(balanceCell);
                 balancesTableBody.appendChild(row);
               });
       

       // Add a new row to display the count of accounts with all tokens
       const countRow = document.createElement("tr");
       const countCell = document.createElement("td");
       countCell.textContent = 'Accounts Total = ' +accountsWithAllTokens.length;
       countCell.setAttribute("colspan", "2");
       countRow.appendChild(countCell);
       holdersTableBody.insertBefore(countRow, holdersTableBody.firstChild);

       // Display the accounts which own all tokens in the new table
       accountsWithAllTokens.forEach(account => {
         const row = document.createElement("tr");
         const accountCell = document.createElement("td");
         accountCell.textContent = account;
         row.appendChild(accountCell);
         holdersTableBody.appendChild(row);
       });


       tokenCounts.forEach(tokenCount => {
         const row = document.createElement("tr");
         const tokenIdCell = document.createElement("td");
         tokenIdCell.textContent = tokenCount.tokenId;
         const balanceCell = document.createElement("td");
         balanceCell.textContent = `${tokenCount.count.toString()} `;
         //console.log('TokenAccount to string: ' + tokenCount.count.toString());
         row.appendChild(tokenIdCell);
         row.appendChild(balanceCell);
         tokenCountsTableBody.appendChild(row);
       });

       // Display the number of accounts holding each tokenId in the new table
       // Display the number of accounts holding each tokenId in the new table
       tokenIds.forEach(tokenId => {
         const row = document.createElement("tr");
         const tokenIdCell = document.createElement("td");
         tokenIdCell.textContent = tokenId;
         const countCell = document.createElement("td");
         const uniqueAccounts = new Set(balances.filter(balance => balance.tokenId === tokenId).map(balance => balance.account));
         const uniqueAccountsCount = uniqueAccounts.size;
         countCell.textContent = uniqueAccountsCount.toString();
         row.appendChild(tokenIdCell);
         row.appendChild(countCell);
         countsTableBody.appendChild(row);
       });





     } catch (error) {
       console.error(error);
     }

   });

   async function getBalances(greaterThanBalance, tokenIds) {

     let holders = {};
     let tokenCounts = [];
     const url_start = 'https://mainnet-public.mirrornode.hedera.com';
     const resultsPerPage = '&limit=100';
     let balances = [];
     let uniqueAccounts = new Set();
     let url_end = '/balances?account.balance=gte%3A' + greaterThanBalance + resultsPerPage;

     for (let i = 0; i < tokenIds.length; i++) {
       //setting each tokenId to a specific token provided by the user
       let tokenId = tokenIds[i];
       //building the full url for each token
       let full_url = url_start + '/api/v1/tokens/' + tokenId + url_end;
       let next = full_url;
       let next_url = next;
       //writing out which token is being fetched
       console.log('Fetching data for token ID:', tokenId);

       // continue fetching data as long as there is a "next" element which is a link to the next page of data
       while (next) {
         try {
           //using axios to fetch the data via API which returns a json file
           let response = await axios.get(next_url);
           //concatenating the balances array with the new data from each page
           balances = balances.concat(response.data.balances.map(balance => {
             //setting each value based on the json file
             return {
               tokenId: tokenId,
               account: balance.account,
               balance: balance.balance
             };
           }));
           //setting the next variable to the next link in the json file
           next = response.data.links.next;
           //building the next url to fetch the next page of data
           next_url = url_start + next;
         } catch (error) {
           throw error;
         }
       }

       // Call the getTokenCounts() function to count the number of accounts and balances for each tokenId
       const tokenCount = await getTokenCounts(tokenId, balances);
       // Add the tokenCount object to the tokenCounts array
       tokenCounts.push(tokenCount);


     }
     //sorting the balances array by balance in descending order
     balances.sort((a, b) => b.balance - a.balance);


     //the key is the account and the value is a set of tokenIds
     holders = balances.reduce((acc, balance) => {
       if (!acc[balance.account]) {
         //console.log('Adding Account: ' + balance.account);
         acc[balance.account] = new Set();
       }
       //adding the token to the set for an exisitng account
       // console.log('Adding the token to the set for an exisitng account')
       acc[balance.account].add(balance.tokenId);
       //console.log('Adding token '+ balance.tokenId + ' to account: '+balance.account); //account added correctly

       return acc;

     }, {});
     //checking the holders object 
     //console.log('Holders: ', holders);


     let accountsWithAllTokens = Object.entries(holders)
       .filter(([_, tokenIdsSet]) => tokenIdsSet.size === tokenIds.length)
       .map(([account, _]) => account);

     //console.log('AccountsWithAllTokens: ', accountsWithAllTokens);

     //console.log('TokenIds Length: ' + tokenIds.length);

     tokenCounts = balances.reduce((acc, balance) => {
       if (!acc[balance.tokenId]) {
         acc[balance.tokenId] = 0;
       }
       acc[balance.tokenId] += Number(balance.balance);
       return acc;
     }, {});

     tokenCounts = Object.entries(tokenCounts).map(([tokenId, count]) => {
       return {
         tokenId,
         count
       };
     });

     tokenCounts.sort((a, b) => b.count - a.count);

     //console.log('TokenCounts:', tokenCounts);

     return { balances, accountsWithAllTokens, tokenCounts };
   }

   // This function counts the number of accounts and balances for each tokenId
   // It returns an object with the tokenId and the count
   // The count is the number of unique accounts that have a balance for the tokenId
   // The count is used to display the total number of NFTs for each tokenId
   async function getTokenCounts(tokenId, balances) {
     uniqueAccounts = new Set(balances.filter(balance => balance.tokenId === tokenId).map(balance => balance.account));
     let accountArray = Array.from(uniqueAccounts);

     //console.log('Unique Accounts: '+ accountArray + ' for token: ' + tokenId);
     //console.log('Unique Accounts Length: ' + uniqueAccounts.size + ' for token: ' + tokenId);

     return { tokenId: tokenId, count: uniqueAccounts.size };
   }

 

   async function getTransactions(tokenId) {
     
     console.log('Token ID: ' + tokenId)
     const url_start = 'https://mainnet-public.mirrornode.hedera.com';
     let totalTransactions = 0;
     let tokenInfo = await axios.get(`${url_start}/api/v1/tokens/${tokenId}`);
     let totalSupply = tokenInfo.data.total_supply;
     //console.log(`Total supply for token ${tokenId}: ${totalSupply}`);
     for(let serialNumber = 1; serialNumber <= totalSupply; serialNumber++) {
      // console.log('Serial Number: ' + serialNumber);
       let next_url = `${url_start}/api/v1/tokens/${tokenId}/nfts/${serialNumber}/transactions`;
       while (next_url) {
         try {
           let response = await axios.get(next_url);
           let transactions = response.data.transactions;
           transactions.forEach(transaction => {
             if (transaction.type === "CRYPTOTRANSFER") {
               totalTransactions += 1;
             }
           });
           next_url = response.data.links.next ? url_start + response.data.links.next : null;
         } catch (error) {
           throw error;
         }
       }
    }
     console.log(`Total CRYPTOTRANSFER transactions for token ${tokenId}: ${totalTransactions}`);
     return totalTransactions;
   
   }

 